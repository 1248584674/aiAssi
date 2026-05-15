// ── 会话上下文记忆管理 ──
import type { SessionContext } from "@ai-assistant/shared";
import type { PrismaClient } from "@prisma/client";

export class MemoryStore {
  constructor(private prisma: PrismaClient) {}

  /** 空的默认上下文 */
  private emptyContext(): SessionContext {
    return { confirmedActions: [] };
  }

  /** 加载会话上下文 */
  async getContext(sessionId: string): Promise<SessionContext> {
    const session = await this.prisma.agentSession.findUnique({
      where: { id: sessionId },
      select: { contextJson: true },
    });

    if (!session?.contextJson) {
      return this.emptyContext();
    }

    try {
      return JSON.parse(session.contextJson) as SessionContext;
    } catch {
      return this.emptyContext();
    }
  }

  /** 更新会话上下文（部分合并） */
  async updateContext(sessionId: string, patch: Partial<SessionContext>): Promise<void> {
    const current = await this.getContext(sessionId);
    const merged: SessionContext = { ...current, ...patch };

    await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: { contextJson: JSON.stringify(merged) },
    });
  }

  /** 清除上下文 */
  async clearContext(sessionId: string): Promise<void> {
    await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: { contextJson: null, currentIntent: null, taskStatus: "active" },
    });
  }
}
