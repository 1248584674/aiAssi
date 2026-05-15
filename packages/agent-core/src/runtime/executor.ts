// ── 执行器：按计划步骤执行 Tool ──
import type { Plan, ToolCallRecord } from "@ai-assistant/shared";
import type { ToolRegistry } from "../tools/tool-registry.js";
import type { AgentLogger } from "../logger/agent-logger.js";

export interface ExecutionResult {
  status: "success" | "partial" | "failed";
  results: ToolCallRecord[];
  nextAction: "ask_missing" | "wait_confirmation" | "done";
}

export class Executor {
  constructor(
    private toolRegistry: ToolRegistry,
    private logger: AgentLogger,
  ) {}

  /** 执行计划步骤 */
  async execute(
    plan: Plan,
    userId: string,
    sessionId: string,
    entities: Record<string, unknown>,
  ): Promise<ExecutionResult> {
    const results: ToolCallRecord[] = [];
    let nextAction: ExecutionResult["nextAction"] = "done";

    for (const step of plan.steps) {
      // 不需要工具的步骤
      if (!step.tool) {
        if (step.action === "wait_confirmation") {
          nextAction = "wait_confirmation";
        }
        continue;
      }

      // 获取工具
      const tool = this.toolRegistry.get(step.tool);
      if (!tool) {
        console.error(`未找到工具: ${step.tool}`);
        continue;
      }

      // 构建输入
      const input = { ...entities, userId };

      try {
        // 输入校验
        const validatedInput = tool.inputSchema.parse(input);
        // 执行工具
        const output = await tool.execute(validatedInput);

        const record: ToolCallRecord = {
          id: crypto.randomUUID(),
          sessionId,
          stepId: step.stepId,
          toolName: tool.name,
          inputJson: input as Record<string, unknown>,
          outputJson: output as Record<string, unknown>,
          status: "success",
          createdAt: new Date().toISOString(),
        };

        results.push(record);
        await this.logger.logToolCall(record);

        // 将工具输出合并到 entities 中供后续步骤使用
        Object.assign(entities, output);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "未知错误";
        console.error(`工具 ${tool.name} 执行失败:`, errorMessage);

        const record: ToolCallRecord = {
          id: crypto.randomUUID(),
          sessionId,
          stepId: step.stepId,
          toolName: tool.name,
          inputJson: input as Record<string, unknown>,
          status: "failed",
          errorMessage,
          createdAt: new Date().toISOString(),
        };

        results.push(record);
        await this.logger.logToolCall(record);

        return { status: "failed", results, nextAction: "done" };
      }
    }

    return { status: "success", results, nextAction };
  }
}
