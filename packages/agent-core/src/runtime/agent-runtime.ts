// ── Agent Runtime 核心编排器 ──
// 串联 IntentRouter → Planner → Validator → Executor 全链路
import type { PrismaClient } from "@prisma/client";
import type { AgentResponse, IntentResult } from "@ai-assistant/shared";

/** SSE 流事件类型 */
export interface StreamEvent {
  type: "user_message" | "intent_start" | "intent_result" | "plan" |
        "validation_start" | "validation_result" | "execution_start" |
        "tool_result" | "done" | "error";
  data: Record<string, unknown> | AgentResponse | IntentResult;
}
import type { LLMProvider } from "../llm/llm.interface.js";
import type { ToolRegistry } from "../tools/tool-registry.js";
import { IntentRouter } from "./intent-router.js";
import { Planner } from "./planner.js";
import { Validator } from "./validator.js";
import { Executor } from "./executor.js";
import { MemoryStore } from "./memory.js";
import { AgentLogger } from "../logger/agent-logger.js";

export class AgentRuntime {
  private intentRouter: IntentRouter;
  private planner: Planner;
  private validator: Validator;
  private executor: Executor;
  private memory: MemoryStore;
  private logger: AgentLogger;
  private prisma: PrismaClient;
  private toolRegistry: ToolRegistry;

  constructor(
    llm: LLMProvider,
    toolRegistry: ToolRegistry,
    prisma: PrismaClient,
  ) {
    this.prisma = prisma;
    this.toolRegistry = toolRegistry;
    this.intentRouter = new IntentRouter(llm);
    this.planner = new Planner();
    this.validator = new Validator(prisma);
    this.memory = new MemoryStore(prisma);
    this.logger = new AgentLogger(prisma);
    this.executor = new Executor(toolRegistry, this.logger);
  }

  /** 处理用户消息 —— 主入口 */
  async handleMessage(input: {
    userId: string;
    sessionId: string;
    message: string;
  }): Promise<AgentResponse> {
    const { userId, sessionId, message } = input;

    // 1. 记录用户消息
    await this.logger.logUserMessage(sessionId, userId, message);

    // 2. 加载会话上下文
    const context = await this.memory.getContext(sessionId);

    // 3. 意图识别
    let intentResult: IntentResult;
    try {
      intentResult = await this.intentRouter.detect(message, context);
      await this.logger.logIntentResult(sessionId, intentResult);
    } catch (err) {
      await this.logger.logError(sessionId, "INTENT_FAILED", "意图识别失败");
      return { type: "error", code: "INTENT_FAILED", message: "意图识别失败，请重新描述您的需求" };
    }

    // 更新会话意图
    await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: { currentIntent: intentResult.intent },
    });

    // 未知意图 → 通用回复
    if (intentResult.intent === "unknown" || intentResult.intent === "general.chat") {
      await this.logger.logAssistantMessage(sessionId, "您好！我是 AI 企业效率助手。您可以让我帮您：\n- 创建日程（例：\"明天下午3点约张三开会\"）\n- 创建报销（例：\"帮我报销昨天打车费128元\"）");
      return { type: "text", message: "您好！我是 AI 企业效率助手。您可以让我帮您：\n- 创建日程（例：\"明天下午3点约张三开会\"）\n- 创建报销（例：\"帮我报销昨天打车费128元\"）" };
    }

    // 4. 生成执行计划
    const plan = this.planner.createPlan(intentResult.intent);
    await this.logger.logPlan(sessionId, plan);

    // 5. 实体 key 归一化 + 合并（支持多轮补充）
    const normalizedNew = normalizeEntities(intentResult.entities);
    // 处理用户明确"没有/无/不需要"的字段——标记为空已填
    const negativeFields = extractNegativeFields(message, context.missingFields || []);
    const mergedEntities = { ...context.entities, ...negativeFields, ...normalizedNew, userId };

    // 日程：有 startTime 无 endTime → 默认 +1 小时
    if (mergedEntities.startTime && !mergedEntities.endTime) {
      const start = new Date(mergedEntities.startTime as string);
      if (!isNaN(start.getTime())) {
        start.setHours(start.getHours() + 1);
        mergedEntities.endTime = start.toISOString();
      }
    }

    // 6. 校验
    const validation = await this.validator.validate(intentResult.intent, mergedEntities);

    // 缺失字段 → 追问用户
    if (!validation.valid && validation.missingFields.length > 0) {
      await this.memory.updateContext(sessionId, {
        intent: intentResult.intent,
        entities: mergedEntities,
        missingFields: validation.missingFields,
      });

      // 增强提示：展示已填和未填字段
      const filledInfo = buildFilledSummary(intentResult.intent, mergedEntities);
      const enhancedMessage = `${validation.message}\n\n已填写：\n${filledInfo}\n\n请补充：${validation.missingFields.map(f => fieldLabel(f)).join("、")}`;

      await this.logger.logMissingFields(sessionId, enhancedMessage, validation.missingFields);

      return {
        type: "missing_fields",
        message: enhancedMessage,
        missingFields: validation.missingFields,
      };
    }

    // 7. 字段完整 → 执行计划
    const execResult = await this.executor.execute(plan, userId, sessionId, mergedEntities);

    if (execResult.status === "failed") {
      return {
        type: "error",
        code: "EXECUTION_FAILED",
        message: "执行过程中出现错误，请稍后重试",
      };
    }

    // 8. 需要确认的操作 → 创建确认请求
    if (execResult.nextAction === "wait_confirmation") {
      // 合并实体和工具输出作为摘要数据（实体包含用户输入，工具输出包含ID）
      const lastOutput = [...execResult.results].reverse().find((r) => r.status === "success");
      const draftData = { ...mergedEntities, ...(lastOutput?.outputJson || {}) };

      // 创建确认请求
      const confirmActionMap: Record<string, string> = {
        "calendar.create": "calendar.confirmEvent",
        "expense.create": "expense.confirmSubmit",
        "todo.complete": "todo.complete",
      };
      const confirmAction = confirmActionMap[intentResult.intent] || intentResult.intent;

      const confirmation = await this.prisma.confirmationRequest.create({
        data: {
          sessionId,
          action: confirmAction,
          summary: this.buildSummary(intentResult.intent, draftData),
          payload: JSON.stringify(draftData),
          status: "pending",
        },
      });

      // 更新上下文
      await this.memory.updateContext(sessionId, {
        intent: intentResult.intent,
        entities: mergedEntities,
        draftData,
      });

      await this.logger.logConfirmation(sessionId, confirmation.summary, draftData);

      return {
        type: "confirmation",
        confirmationId: confirmation.id,
        summary: confirmation.summary,
        payload: draftData,
      };
    }

    // 9. 返回工具执行结果
    await this.logger.logAssistantMessage(
      sessionId,
      "工具执行完成",
      "tool_result",
      JSON.stringify({ results: execResult.results }),
    );
    return {
      type: "tool_result",
      results: execResult.results,
    };
  }

  /** 流式处理用户消息 —— 每阶段 yield 事件，供 SSE 消费 */
  async *handleMessageStream(input: {
    userId: string;
    sessionId: string;
    message: string;
  }): AsyncGenerator<StreamEvent> {
    const { userId, sessionId, message } = input;

    // 1. 记录用户消息
    await this.logger.logUserMessage(sessionId, userId, message);
    yield { type: "user_message", data: { sessionId, message } };

    // 2. 加载会话上下文
    const context = await this.memory.getContext(sessionId);

    // 3. 意图识别
    yield { type: "intent_start", data: {} };
    let intentResult: IntentResult;
    try {
      intentResult = await this.intentRouter.detect(message, context);
      await this.logger.logIntentResult(sessionId, intentResult);
      yield { type: "intent_result", data: intentResult };
    } catch (err) {
      await this.logger.logError(sessionId, "INTENT_FAILED", "意图识别失败");
      yield { type: "error", data: { code: "INTENT_FAILED", message: "意图识别失败" } };
      return;
    }

    // 更新会话意图
    await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: { currentIntent: intentResult.intent },
    });

    // 未知意图
    if (intentResult.intent === "unknown" || intentResult.intent === "general.chat") {
      const helpMsg = "您好！我是 AI 企业效率助手。您可以让我帮您：\n- 创建日程\n- 创建报销\n- 创建待办";
      await this.logger.logAssistantMessage(sessionId, helpMsg, "text");
      yield { type: "done", data: { type: "text", message: helpMsg } };
      return;
    }

    // 4. 生成执行计划
    const plan = this.planner.createPlan(intentResult.intent);
    yield { type: "plan", data: plan };

    // 5. 实体归一化 + 合并
    const normalizedNew = normalizeEntities(intentResult.entities);
    const negativeFields = extractNegativeFields(message, context.missingFields || []);
    const mergedEntities = { ...context.entities, ...negativeFields, ...normalizedNew, userId };

    // 日程：有 startTime 无 endTime → 默认 +1 小时
    if (mergedEntities.startTime && !mergedEntities.endTime) {
      const start = new Date(mergedEntities.startTime as string);
      if (!isNaN(start.getTime())) {
        start.setHours(start.getHours() + 1);
        mergedEntities.endTime = start.toISOString();
      }
    }

    // 6. 校验
    yield { type: "validation_start", data: {} };
    const validation = await this.validator.validate(intentResult.intent, mergedEntities);
    yield { type: "validation_result", data: validation };

    // 缺失字段
    if (!validation.valid && validation.missingFields.length > 0) {
      await this.memory.updateContext(sessionId, {
        intent: intentResult.intent,
        entities: mergedEntities,
        missingFields: validation.missingFields,
      });

      const filledInfo = buildFilledSummary(intentResult.intent, mergedEntities);
      const enhancedMessage = `${validation.message}\n\n已填写：\n${filledInfo}\n\n请补充：${validation.missingFields.map(f => fieldLabel(f)).join("、")}`;

      await this.logger.logMissingFields(sessionId, enhancedMessage, validation.missingFields);

      yield {
        type: "done",
        data: {
          type: "missing_fields",
          message: enhancedMessage,
          missingFields: validation.missingFields,
        },
      };
      return;
    }

    // 7. 执行计划
    yield { type: "execution_start", data: { steps: plan.steps } };
    const execResult = await this.executor.execute(plan, userId, sessionId, mergedEntities);

    for (const r of execResult.results) {
      yield { type: "tool_result", data: r };
    }

    if (execResult.status === "failed") {
      await this.logger.logError(sessionId, "EXECUTION_FAILED", "执行失败");
      yield { type: "done", data: { type: "error", code: "EXECUTION_FAILED", message: "执行失败" } };
      return;
    }

    // 8. 确认流程
    if (execResult.nextAction === "wait_confirmation") {
      const lastOutput = [...execResult.results].reverse().find((r) => r.status === "success");
      const draftData = { ...mergedEntities, ...(lastOutput?.outputJson || {}) };

      const confirmActionMap: Record<string, string> = {
        "calendar.create": "calendar.confirmEvent",
        "expense.create": "expense.confirmSubmit",
        "todo.complete": "todo.complete",
      };
      const confirmAction = confirmActionMap[intentResult.intent] || intentResult.intent;

      const confirmation = await this.prisma.confirmationRequest.create({
        data: {
          sessionId,
          action: confirmAction,
          summary: this.buildSummary(intentResult.intent, draftData),
          payload: JSON.stringify(draftData),
          status: "pending",
        },
      });

      await this.memory.updateContext(sessionId, {
        intent: intentResult.intent,
        entities: mergedEntities,
        draftData,
      });

      await this.logger.logConfirmation(sessionId, confirmation.summary, draftData);

      yield {
        type: "done",
        data: {
          type: "confirmation",
          confirmationId: confirmation.id,
          summary: confirmation.summary,
          payload: draftData,
        },
      };
      return;
    }

    // 9. 直接完成（tool_result）—— 存储完整结果到 metadata
    await this.logger.logAssistantMessage(
      sessionId,
      "工具执行完成",
      "tool_result",
      JSON.stringify({ results: execResult.results }),
    );
    yield {
      type: "done",
      data: { type: "tool_result", results: execResult.results },
    };
  }

  /** Token 级流式处理 —— 意图识别阶段逐字输出 */
  async *handleMessageTokenStream(input: {
    userId: string;
    sessionId: string;
    message: string;
  }): AsyncGenerator<any> {
    const { userId, sessionId, message } = input;

    await this.logger.logUserMessage(sessionId, userId, message);
    yield { type: "user_message", data: { sessionId, message } };

    const context = await this.memory.getContext(sessionId);

    // 意图识别（Token 级流式）
    yield { type: "intent_start", data: {} };
    let intentResult: IntentResult = { intent: "unknown", confidence: 0, entities: {} };

    for await (const event of this.intentRouter.detectStream(message, context)) {
      if (event.type === "token") {
        yield { type: "token", text: event.text };
      } else if (event.type === "intent_result") {
        intentResult = event.data;
        await this.logger.logIntentResult(sessionId, intentResult);
        yield { type: "intent_result", data: intentResult };
      }
    }

    await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: { currentIntent: intentResult.intent },
    });

    if (intentResult.intent === "unknown" || intentResult.intent === "general.chat") {
      const helpMsg = "您好！我是 AI 企业效率助手。您可以让我帮您：\n- 创建日程\n- 创建报销\n- 创建待办";
      await this.logger.logAssistantMessage(sessionId, helpMsg, "text");
      yield { type: "done", data: { type: "text", message: helpMsg } };
      return;
    }

    // 后续阶段（复用现有流式逻辑）
    const plan = this.planner.createPlan(intentResult.intent);
    yield { type: "plan", data: plan };

    const normalizedNew = normalizeEntities(intentResult.entities);
    const negativeFields = extractNegativeFields(message, context.missingFields || []);
    const mergedEntities = { ...context.entities, ...negativeFields, ...normalizedNew, userId };

    if (mergedEntities.startTime && !mergedEntities.endTime) {
      const start = new Date(mergedEntities.startTime as string);
      if (!isNaN(start.getTime())) {
        start.setHours(start.getHours() + 1);
        mergedEntities.endTime = start.toISOString();
      }
    }

    yield { type: "validation_start", data: {} };
    const validation = await this.validator.validate(intentResult.intent, mergedEntities);
    yield { type: "validation_result", data: validation };

    if (!validation.valid && validation.missingFields.length > 0) {
      await this.memory.updateContext(sessionId, { intent: intentResult.intent, entities: mergedEntities, missingFields: validation.missingFields });
      const filledInfo = buildFilledSummary(intentResult.intent, mergedEntities);
      const enhancedMessage = `${validation.message}\n\n已填写：\n${filledInfo}\n\n请补充：${validation.missingFields.map(f => fieldLabel(f)).join("、")}`;
      await this.logger.logMissingFields(sessionId, enhancedMessage, validation.missingFields);
      yield { type: "done", data: { type: "missing_fields", message: enhancedMessage, missingFields: validation.missingFields } };
      return;
    }

    yield { type: "execution_start", data: { steps: plan.steps } };
    const execResult = await this.executor.execute(plan, userId, sessionId, mergedEntities);
    for (const r of execResult.results) {
      yield { type: "tool_result", data: r };
    }

    if (execResult.status === "failed") {
      await this.logger.logError(sessionId, "EXECUTION_FAILED", "执行失败");
      yield { type: "done", data: { type: "error", code: "EXECUTION_FAILED", message: "执行失败" } };
      return;
    }

    if (execResult.nextAction === "wait_confirmation") {
      const lastOutput = [...execResult.results].reverse().find((r) => r.status === "success");
      const draftData = { ...mergedEntities, ...(lastOutput?.outputJson || {}) };
      const confirmActionMap: Record<string, string> = { "calendar.create": "calendar.confirmEvent", "expense.create": "expense.confirmSubmit", "todo.complete": "todo.complete" };
      const confirmAction = confirmActionMap[intentResult.intent] || intentResult.intent;
      const confirmation = await this.prisma.confirmationRequest.create({
        data: { sessionId, action: confirmAction, summary: this.buildSummary(intentResult.intent, draftData), payload: JSON.stringify(draftData), status: "pending" },
      });
      await this.memory.updateContext(sessionId, { intent: intentResult.intent, entities: mergedEntities, draftData });
      await this.logger.logConfirmation(sessionId, confirmation.summary, draftData);
      yield { type: "done", data: { type: "confirmation", confirmationId: confirmation.id, summary: confirmation.summary, payload: draftData } };
      return;
    }

    await this.logger.logAssistantMessage(sessionId, "工具执行完成", "tool_result", JSON.stringify({ results: execResult.results }));
    yield { type: "done", data: { type: "tool_result", results: execResult.results } };
  }

  /** 处理用户确认操作 */
  async handleConfirmation(input: {
    confirmationId: string;
    confirmed: boolean;
  }): Promise<AgentResponse> {
    const { confirmationId, confirmed } = input;

    // 查找确认请求
    const confirmation = await this.prisma.confirmationRequest.findUnique({
      where: { id: confirmationId },
    });

    if (!confirmation) {
      return { type: "error", code: "NOT_FOUND", message: "确认请求不存在" };
    }

    if (confirmation.status !== "pending") {
      return { type: "error", code: "ALREADY_PROCESSED", message: "该操作已被处理" };
    }

    // 更新确认状态
    await this.prisma.confirmationRequest.update({
      where: { id: confirmationId },
      data: {
        status: confirmed ? "confirmed" : "cancelled",
      },
    });

    if (!confirmed) {
      await this.logger.logAssistantMessage(confirmation.sessionId, "操作已取消");
      return { type: "text", message: "操作已取消" };
    }

    // 解析 payload 并执行确认操作
    const payload = JSON.parse(confirmation.payload) as Record<string, unknown>;
    const tool = this.toolRegistry.get(confirmation.action);

    if (!tool) {
      await this.logger.logError(confirmation.sessionId, "TOOL_NOT_FOUND", `未找到工具: ${confirmation.action}`);
      return { type: "error", code: "TOOL_NOT_FOUND", message: "操作失败，未找到对应工具" };
    }

    try {
      const validatedInput = tool.inputSchema.parse(payload);
      const output = await tool.execute(validatedInput);

      await this.logger.logToolCall({
        id: crypto.randomUUID(),
        sessionId: confirmation.sessionId,
        toolName: tool.name,
        inputJson: payload,
        outputJson: output as Record<string, unknown>,
        status: "success",
        createdAt: new Date().toISOString(),
      });

      await this.logger.logAssistantMessage(
        confirmation.sessionId,
        `✅ ${(output as Record<string, string>).message || "操作执行成功"}`,
        "tool_result",
      );

      return {
        type: "tool_result",
        results: [{
          id: crypto.randomUUID(),
          sessionId: confirmation.sessionId,
          toolName: tool.name,
          inputJson: payload,
          outputJson: output as Record<string, unknown>,
          status: "success",
          createdAt: new Date().toISOString(),
        }],
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "未知错误";
      await this.logger.logError(confirmation.sessionId, "EXECUTION_FAILED", errorMessage);
      return { type: "error", code: "EXECUTION_FAILED", message: errorMessage };
    }
  }

  // ── 私有辅助 ──

  /** 构建确认摘要 */
  private buildSummary(intent: string, data: Record<string, unknown>): string {
    switch (intent) {
      case "calendar.create": {
        const title = data.title || "未命名日程";
        const start = data.startTime || data.start_time || "";
        const end = data.endTime || data.end_time || "";
        const participants = Array.isArray(data.participants) ? data.participants.join("、") : "无";
        return `日程：${title}\n时间：${start} ~ ${end}\n参与人：${participants}`;
      }
      case "expense.create": {
        const type = data.expenseType || "其他";
        const amount = data.amount || "未知";
        const desc = data.description || "无";
        return `费用报销\n类型：${type}\n金额：${amount} 元\n说明：${desc}`;
      }
      case "todo.create": {
        const title = data.title || "未命名待办";
        const priority = data.priority || "medium";
        const dueDate = data.dueDate || data.due_date || "";
        return `待办：${title}\n优先级：${priority}\n截止日期：${dueDate || "无"}`;
      }
      case "todo.complete": {
        const title = data.title || "未命名待办";
        return `确认完成待办：${title}`;
      }
      default:
        return `确认执行 ${intent}？`;
    }
  }
}

// ── 实体 key 归一化：将 LLM 输出的各种 key 映射到标准字段名 ──

const ENTITY_KEY_MAP: Record<string, string> = {
  // 费用类型变体
  type: "expenseType",
  expense_type: "expenseType",
  category: "expenseType",
  // 日期变体
  date: "expenseDate",
  expense_date: "expenseDate",
  // 项目变体
  project: "projectId",
  project_id: "projectId",
  // 发票变体
  invoice: "invoiceFileIds",
  invoice_file: "invoiceFileIds",
  // 说明变体
  note: "description",
  detail: "description",
  // 标题变体
  name: "title",
  event: "title",
  // 优先级变体
  level: "priority",
  urgent_level: "priority",
  // 截止日期变体
  deadline: "dueDate",
  due_date: "dueDate",
  due: "dueDate",
  // 参与人变体
  participant: "participants",
  person: "participants",
  attendee: "participants",
  // 负责人变体
  assigned_to: "assignee",
  owner: "assignee",
};

export function normalizeEntities(entities: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entities)) {
    // 跳过空值
    if (value === null || value === undefined || value === "" ||
        (Array.isArray(value) && value.length === 0)) {
      continue;
    }
    // 跳过 userId（由系统注入）
    if (key === "userId") continue;
    // 跳过已经是标准 key 的中文 key
    if (/[一-龥]/.test(key)) continue;

    const mappedKey = ENTITY_KEY_MAP[key] || key;
    normalized[mappedKey] = value;
  }

  // 后处理：费用类型兜底（如果 LLM 返回了中文值）
  if (typeof normalized.expenseType === "string") {
    const et = normalized.expenseType as string;
    const typeMap: Record<string, string> = { "交通": "transport", "打车": "transport", "住宿": "hotel", "酒店": "hotel", "餐": "meal", "吃饭": "meal", "办公": "office", "文具": "office", "差旅": "travel", "出差": "travel" };
    if (typeMap[et]) normalized.expenseType = typeMap[et];
  }

  // 后处理：日期格式（确保 expenseDate/dueDate/startTime/endTime 是 ISO 字符串）
  for (const dateKey of ["expenseDate", "dueDate", "startTime", "endTime"]) {
    const val = normalized[dateKey];
    if (typeof val === "string" && !val.includes("-")) {
      // 可能是"明天""后天"等未转换的文本，尝试解析
      const parsed = parseRelativeDate(val);
      if (parsed) normalized[dateKey] = parsed;
    }
  }

  return normalized;
}

/** 解析相对日期文本（兜底） */
export function parseRelativeDate(text: string): string | null {
  const now = new Date();
  if (text === "今天") return now.toISOString().split("T")[0];
  if (text === "昨天") { const d = new Date(now); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; }
  if (text === "明天") { const d = new Date(now); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; }
  if (text === "前天") { const d = new Date(now); d.setDate(d.getDate() - 2); return d.toISOString().split("T")[0]; }
  if (text === "后天") { const d = new Date(now); d.setDate(d.getDate() + 2); return d.toISOString().split("T")[0]; }
  return null;
}

/** 构建已填字段摘要 */
export function buildFilledSummary(intent: string, entities: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(entities)) {
    if (key === "userId" || value === undefined || value === null) continue;
    const label = fieldLabel(key);
    const display = Array.isArray(value) ? value.join("、") : String(value);
    if (display && display !== "undefined" && display !== "") {
      lines.push(`  ${label}：${display}`);
    }
  }
  return lines.length > 0 ? lines.join("\n") : "  （暂无）";
}

/** 处理用户明确表示"没有/无/不需要"的缺失字段 */
export function extractNegativeFields(
  message: string,
  _missingFields: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  // 中文否定关键词
  const hasNeg = /没有|无|不需要|没带|没了|不用|算了/.test(message);

  if (!hasNeg) return result;

  // 用户明确说没有发票 → 设 invoiceFileIds 为空数组
  if (/发票/.test(message)) {
    result.invoiceFileIds = [];
    result.invoiceFileIds = [];
  }
  // 用户说没有项目 → 设 projectId 为 "无"
  if (/项目/.test(message)) {
    result.projectId = "无";
  }
  // 用户说没有说明/不用说明 → 设 description 为 ""
  if (/说明|描述/.test(message)) {
    result.description = "";
  }
  // 用户说没有截止日期
  if (/截止|期限/.test(message)) {
    result.dueDate = null;
  }

  return result;
}

/** 字段名中文映射 */
export function fieldLabel(field: string): string {
  const map: Record<string, string> = {
    title: "标题",
    startTime: "开始时间",
    endTime: "结束时间",
    participants: "参与人",
    description: "说明",
    amount: "金额",
    expenseType: "费用类型",
    expenseDate: "费用日期",
    projectId: "项目归属",
    invoiceFileIds: "发票",
    priority: "优先级",
    dueDate: "截止日期",
    assignee: "负责人",
  };
  return map[field] || field;
}
