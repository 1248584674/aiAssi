// ── 报销管理路由 ──
import { Router } from "express";
import { prisma } from "../db.js";

export const expenseRoutes = Router();

/** GET /api/v1/expenses — 获取用户报销列表 */
expenseRoutes.get("/", async (req, res, next) => {
  try {
    const userId = req.userId as string;
    if (!userId) {
      res.status(400).json({ data: null, message: "缺少 x-user-id header" });
      return;
    }

    const expenses = await prisma.expense.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ data: { expenses }, message: "ok" });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/expenses/:id — 获取单个报销详情 */
expenseRoutes.get("/:id", async (req, res, next) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
    });

    if (!expense) {
      res.status(404).json({ data: null, message: "报销不存在" });
      return;
    }

    res.json({ data: { expense }, message: "ok" });
  } catch (err) {
    next(err);
  }
});
