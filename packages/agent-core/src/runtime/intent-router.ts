// ── 意图识别器（LLM 驱动）— 支持多轮上下文 ──
import type { LLMProvider } from "../llm/llm.interface.js";
import type { IntentResult, SessionContext } from "@ai-assistant/shared";
import { intentSchema } from "../schemas/intent.schema.js";

/** LLM System Prompt 模板——精确指定实体字段名 + Few-shot 示例 */
const SYSTEM_PROMPT = `你是一个企业效率助手的意图识别模块。根据用户输入判断意图并提取实体。

## 意图判断（注意：意图之间互斥，选择最匹配的一个）

**calendar.create** 创建日程
关键词：约、开会、会议、安排、日程、订、约见、碰面、面谈
示例：
- "明天下午3点约张三开会" → calendar.create
- "下周一上午十点约王五和李六开项目启动会" → calendar.create
- "帮我安排后天和周二的例会" → calendar.create

**expense.create** 创建报销
关键词：报销、打车、住宿、酒店、餐费、发票、交通费、差旅、花了、花费、费用
示例：
- "帮我报销昨天打车费128元" → expense.create
- "前天住宿花了500元，帮我报销" → expense.create
- "报销上周的办公用品费200元" → expense.create

**todo.create** 创建待办
关键词：待办、任务、提醒、帮我创建、帮我记、别忘了、需要做、记得、todo、备忘
示例：
- "帮我创建待办：周五前完成Q2报告" → todo.create
- "帮我记一个：后天下午3点前提交年度报告给张总" → todo.create
- "别忘了明天开会要准备的PPT" → todo.create

**todo.query** 查询待办
关键词：我有哪些待办、待办列表、查看待办、还有什么任务、我的待办、查待办、看看待办、有什么待办、有哪些任务
示例："我有哪些待办" → todo.query、"查看待办列表" → todo.query、"有什么任务" → todo.query
**todo.complete** 完成待办
关键词：完成了、做完了、搞定了、标记完成
**calendar.query** 查询日程（关键词：我有哪些日程、查看日程、我的日程、日程列表、什么安排）
**expense.query** 查询报销（关键词：我有哪些报销、查看报销、我的报销、报销记录、报销列表）
**general.chat** 闲聊（问候/感谢/纯对话）  **unknown** 无法识别

## 实体字段（必须用以下英文 key）

| 字段 | 说明 | 取值 |
|------|------|------|
| title | 标题 | 字符串 |
| startTime | 开始时间 | ISO格式如"2026-05-15T14:00" |
| endTime | 结束时间 | ISO格式 |
| participants | 参与人 | 字符串数组，如["张三","李四"] |
| amount | 金额 | 纯数字，如128 |
| expenseType | 费用类型 | transport/hotel/meal/office/travel/other |
| expenseDate | 费用日期 | ISO日期如"2026-05-14" |
| projectId | 项目归属 | 字符串 |
| priority | 优先级 | low/medium/high/urgent |
| dueDate | 截止日期 | ISO日期 |
| assignee | 负责人 | 字符串 |
| description | 说明 | 字符串 |

## 关键规则

1. **日期转换**（参考系统时间）：
   昨天→前一日, 今天→当日, 明天→后一日, 前天→前二日, 后天→后二日
   下周一/周二...→下一周的对应日, 上周一...→上一周的对应日
   "下午3点"→补充时间"T15:00", "上午十点"→"T10:00"

2. **费用类型**：打车/交通→transport, 住宿/酒店→hotel, 吃饭/餐/聚餐→meal, 办公/文具→office, 差旅/出差→travel, 其他→other

3. **参与人提取**："约A和B"→["A","B"], "约A、B、C"→["A","B","C"]
   人名通常为2-3个汉字，取"约/和/跟/与/找"后面连续的人名

4. **金额**：数字后跟"元/块"时提取数字，"一百二十八"→128

5. **优先级**：紧急/urgent→urgent, 高/high→high, 中/普通→medium, 低/low→low

返回 JSON：{"intent":"...", "confidence":0.0-1.0, "entities":{...}}
只包含能从文本中明确提取的字段，不要凭空填写。`;

export class IntentRouter {
  constructor(private llm: LLMProvider) {}

  /** 识别用户意图 */
  async detect(message: string, context?: SessionContext): Promise<IntentResult> {
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
    ];

    // 多轮上下文：如果上一轮有意图且缺失字段，强提示这是补充信息
    if (context?.intent && context.missingFields && context.missingFields.length > 0) {
      messages.push({
        role: "system" as const,
        content: `【重要】上一轮意图是「${context.intent}」，当前缺少字段：${context.missingFields.join("、")}。用户当前输入极可能是补充这些缺失字段的值。请保持意图为「${context.intent}」并从用户输入中提取对应字段值。
已提取到的实体：${JSON.stringify(context.entities || {})}`,
      });
    } else if (context?.intent) {
      messages.push({
        role: "system" as const,
        content: `上一轮对话的意图是「${context.intent}」，用户可能在补充信息或开启新话题。`,
      });
    }

    // 注入当前日期到 system prompt（LLM 需要知道真实日期）
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}（周${["日","一","二","三","四","五","六"][today.getDay()]}）`;
    messages[0].content = `当前日期：${dateStr}\n\n${messages[0].content}`;

    messages.push({ role: "user" as const, content: message });

    try {
      const result = await this.llm.chat(messages, intentSchema);
      return result.data as unknown as IntentResult;
    } catch (err) {
      console.error("意图识别失败:", err);
      return {
        intent: "unknown",
        confidence: 0,
        entities: {},
      };
    }
  }

  /** 流式意图识别 —— 逐 token yield + 最终结果 */
  async *detectStream(
    message: string,
    context?: SessionContext,
  ): AsyncGenerator<{ type: "token"; text: string } | { type: "intent_result"; data: IntentResult }> {
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
    ];

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}（周${["日","一","二","三","四","五","六"][today.getDay()]}）`;
    messages[0].content = `当前日期：${dateStr}\n\n${messages[0].content}`;

    if (context?.intent && context.missingFields && context.missingFields.length > 0) {
      messages.push({
        role: "system" as const,
        content: `【重要】上一轮意图是「${context.intent}」，当前缺少字段：${context.missingFields.join("、")}。用户当前输入极可能是补充这些缺失字段的值。请保持意图为「${context.intent}」并从用户输入中提取对应字段值。已提取到的实体：${JSON.stringify(context.entities || {})}`,
      });
    } else if (context?.intent) {
      messages.push({
        role: "system" as const,
        content: `上一轮对话的意图是「${context.intent}」，用户可能在补充信息或开启新话题。`,
      });
    }

    messages.push({ role: "user" as const, content: message });

    try {
      let fullText = "";
      for await (const token of (this.llm as any).chatStream(messages, intentSchema)) {
        fullText += token;
        yield { type: "token", text: token as string };
      }

      // 解析完整 JSON
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const validated = intentSchema.parse(parsed);
        yield { type: "intent_result", data: validated as unknown as IntentResult };
      } else {
        yield { type: "intent_result", data: { intent: "unknown", confidence: 0, entities: {} } };
      }
    } catch (err) {
      console.error("流式意图识别失败:", err);
      yield { type: "intent_result", data: { intent: "unknown", confidence: 0, entities: {} } };
    }
  }
}