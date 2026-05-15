// ── 会话管理路由 ──
import { Router } from "express";
import { prisma } from "../db.js";

export const sessionRoutes = Router();

/** POST /api/v1/sessions — 创建新会话 */
sessionRoutes.post("/", async (req, res, next) => {
  try {
    const userId = req.userId as string;
    if (!userId) {
      res.status(400).json({ data: null, message: "缺少 x-user-id header" });
      return;
    }

    const session = await prisma.agentSession.create({
      data: { userId },
    });

    res.json({
      data: { sessionId: session.id, createdAt: session.createdAt.toISOString() },
      message: "ok",
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/sessions — 获取用户会话列表 */
sessionRoutes.get("/", async (req, res, next) => {
  try {
    const userId = req.userId as string;
    if (!userId) {
      res.status(400).json({ data: null, message: "缺少 x-user-id header" });
      return;
    }

    const sessions = await prisma.agentSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        currentIntent: true,
        taskStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ data: { sessions }, message: "ok" });
  } catch (err) {
    next(err);
  }
});
