// ── Tool 注册中心 ──
import type { AgentTool } from "./tool.interface.js";

export class ToolRegistry {
  private tools = new Map<string, AgentTool>();

  /** 注册一个工具 */
  register(tool: AgentTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`工具 "${tool.name}" 已被注册`);
    }
    this.tools.set(tool.name, tool);
  }

  /** 获取工具 */
  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  /** 列出所有已注册工具 */
  list(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  /** 判断是否需要确认 */
  requiresConfirmation(toolName: string): boolean {
    const tool = this.tools.get(toolName);
    return tool?.requiresConfirmation ?? false;
  }
}
