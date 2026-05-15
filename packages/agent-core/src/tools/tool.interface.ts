// ── Tool 接口定义 ──
import type { ZodSchema } from "zod";

/** Agent 工具接口 —— 所有业务能力必须封装为 Tool */
export interface AgentTool<Input = Record<string, unknown>, Output = Record<string, unknown>> {
  /** 工具名称，全局唯一（如 "calendar.createDraft"） */
  name: string;
  /** 工具用途描述 */
  description: string;
  /** 输入参数 Zod Schema，用于运行时校验 */
  inputSchema: ZodSchema<Input>;
  /** 是否需要用户确认 */
  requiresConfirmation: boolean;
  /** 风险等级 */
  riskLevel: "low" | "medium" | "high";
  /** 执行工具 */
  execute(input: Input): Promise<Output>;
}
