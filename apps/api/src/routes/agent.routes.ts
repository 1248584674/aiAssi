// ── Agent 聊天路由 ──
import { Router } from "express";
import { getAgentRuntime } from "../services/agent.service.js";
import { prisma } from "../db.js";

export const agentRoutes = Router();

/** POST /api/v1/agent/chat — 发送消息给 Agent */
agentRoutes.post("/chat", async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { sessionId, message } = req.body as { sessionId?: string; message?: string };

    if (!sessionId || !message) {
      res.status(400).json({ data: null, message: "缺少 sessionId 或 message" });
      return;
    }

    const runtime = getAgentRuntime();
    const response = await runtime.handleMessage({ userId, sessionId, message });

    res.json({ data: response, message: "ok" });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/agent/chat/stream — SSE 流式消息 */
agentRoutes.post("/chat/stream", async (req, res) => {
  const userId = req.userId!;
  const { sessionId, message } = (req.body || {}) as { sessionId?: string; message?: string };

  if (!sessionId || !message) {
    res.status(400).json({ data: null, message: "缺少 sessionId 或 message" });
    return;
  }

  // 设置 SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  try {
    const runtime = getAgentRuntime();
    const stream = runtime.handleMessageStream({ userId, sessionId, message });

    for await (const event of stream) {
      const line = `data: ${JSON.stringify(event)}\n\n`;
      res.write(line);
    }
  } catch (err) {
    const errorLine = `event: error\ndata: ${JSON.stringify({ message: (err as Error).message })}\n\n`;
    res.write(errorLine);
  } finally {
    res.end();
  }
});

/** POST /api/v1/agent/chat/tokens — SSE Token 级流式消息 */
agentRoutes.post("/chat/tokens", async (req, res) => {
  const userId = req.userId!;
  const { sessionId, message } = (req.body || {}) as { sessionId?: string; message?: string };

  if (!sessionId || !message) {
    res.status(400).json({ data: null, message: "缺少 sessionId 或 message" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  try {
    const runtime = getAgentRuntime();
    const stream = runtime.handleMessageTokenStream({ userId, sessionId, message });

    for await (const event of stream) {
      const line = `data: ${JSON.stringify(event)}\n\n`;
      res.write(line);
    }
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: (err as Error).message })}\n\n`);
  } finally {
    res.end();
  }
});

/** GET /api/v1/agent/sessions/:sessionId/messages — 获取会话消息历史 */
agentRoutes.get("/sessions/:sessionId/messages", async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const messages = await prisma.agentMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    res.json({ data: { messages }, message: "ok" });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/agent/sessions/:sessionId/tool-calls — 获取工具调用日志 */
agentRoutes.get("/sessions/:sessionId/tool-calls", async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const toolCalls = await prisma.agentToolCall.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    res.json({ data: { toolCalls }, message: "ok" });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/agent/confirm — 确认/取消操作 */
agentRoutes.post("/confirm", async (req, res, next) => {
  try {
    const { confirmationId, confirmed } = req.body as {
      confirmationId?: string;
      confirmed?: boolean;
    };

    if (!confirmationId) {
      res.status(400).json({ data: null, message: "缺少 confirmationId" });
      return;
    }

    const runtime = getAgentRuntime();
    const response = await runtime.handleConfirmation({
      confirmationId,
      confirmed: confirmed ?? false,
    });

    res.json({ data: response, message: "ok" });
  } catch (err) {
    next(err);
  }
});
