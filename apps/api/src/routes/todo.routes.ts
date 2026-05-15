// ── 任务待办管理路由 ──
import { Router } from "express";
import { prisma } from "../db.js";

export const todoRoutes = Router();

/** GET /api/v1/todos — 获取用户待办列表 */
todoRoutes.get("/", async (req, res, next) => {
  try {
    const userId = req.userId as string;
    if (!userId) {
      res.status(400).json({ data: null, message: "缺少 x-user-id header" });
      return;
    }

    const todos = await prisma.todo.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ data: { todos }, message: "ok" });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/todos/:id — 获取单个待办详情 */
todoRoutes.get("/:id", async (req, res, next) => {
  try {
    const todo = await prisma.todo.findUnique({
      where: { id: req.params.id },
    });

    if (!todo) {
      res.status(404).json({ data: null, message: "待办不存在" });
      return;
    }

    res.json({ data: { todo }, message: "ok" });
  } catch (err) {
    next(err);
  }
});
