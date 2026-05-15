// ── Agent 日志记录器（写入数据库） ──
import type { PrismaClient } from "@prisma/client";
import type { IntentResult, Plan, ToolCallRecord } from "@ai-assistant/shared";

export class AgentLogger {
  constructor(private prisma: PrismaClient) {}

  /** 记录用户消息 */
  async logUserMessage(sessionId: string, userId: string, message: string): Promise<string> {
    const msg = await this.prisma.agentMessage.create({
      data: {
        sessionId,
        role: "user",
        type: "text",
        content: message,
      },
    });
    return msg.id;
  }

  /** 记录意图识别结果 */
  async logIntentResult(sessionId: string, result: IntentResult): Promise<string> {
    const msg = await this.prisma.agentMessage.create({
      data: {
        sessionId,
        role: "assistant",
        type: "intent_result",
        content: `识别意图：${result.intent}（置信度：${(result.confidence * 100).toFixed(0)}%）`,
        metadata: JSON.stringify(result),
      },
    });
    return msg.id;
  }

  /** 记录 Planner 输出 */
  async logPlan(sessionId: string, plan: Plan): Promise<string> {
    const msg = await this.prisma.agentMessage.create({
      data: {
        sessionId,
        role: "system",
        type: "text",
        content: `执行计划：${plan.goal}`,
        metadata: JSON.stringify(plan),
      },
    });
    return msg.id;
  }

  /** 记录助手文本消息 */
  async logAssistantMessage(sessionId: string, content: string, type = "text", metadata?: string): Promise<string> {
    const msg = await this.prisma.agentMessage.create({
      data: {
        sessionId,
        role: "assistant",
        type,
        content,
        metadata: metadata || undefined,
      },
    });
    return msg.id;
  }

  /** 记录缺失字段消息 */
  async logMissingFields(sessionId: string, message: string, missingFields: string[]): Promise<string> {
    const msg = await this.prisma.agentMessage.create({
      data: {
        sessionId,
        role: "assistant",
        type: "missing_fields",
        content: message,
        metadata: JSON.stringify({ missingFields }),
      },
    });
    return msg.id;
  }

  /** 记录确认请求 */
  async logConfirmation(sessionId: string, summary: string, payload: unknown): Promise<string> {
    const msg = await this.prisma.agentMessage.create({
      data: {
        sessionId,
        role: "assistant",
        type: "confirmation",
        content: summary,
        metadata: JSON.stringify(payload),
      },
    });
    return msg.id;
  }

  /** 记录错误 */
  async logError(sessionId: string, code: string, message: string): Promise<string> {
    const msg = await this.prisma.agentMessage.create({
      data: {
        sessionId,
        role: "system",
        type: "error",
        content: message,
        metadata: JSON.stringify({ code }),
      },
    });
    return msg.id;
  }

  /** 记录工具调用 */
  async logToolCall(record: ToolCallRecord): Promise<void> {
    await this.prisma.agentToolCall.create({
      data: {
        sessionId: record.sessionId,
        stepId: record.stepId,
        toolName: record.toolName,
        inputJson: JSON.stringify(record.inputJson),
        outputJson: record.outputJson ? JSON.stringify(record.outputJson) : null,
        status: record.status,
        errorMessage: record.errorMessage,
      },
    });
  }
}
