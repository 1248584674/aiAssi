// ── 数据统计路由 ──
import { Router } from "express";
import { prisma } from "../db.js";

export const statsRoutes = Router();

/** GET /api/v1/stats — 聚合统计数据 */
statsRoutes.get("/", async (req, res, next) => {
  try {
    const userId = req.userId!;

    // 报销统计
    const expenses = await prisma.expense.findMany({ where: { userId } });
    const expenseTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const expenseByType: Record<string, { count: number; total: number }> = {};
    for (const e of expenses) {
      const t = e.expenseType || "other";
      if (!expenseByType[t]) expenseByType[t] = { count: 0, total: 0 };
      expenseByType[t].count++;
      expenseByType[t].total += e.amount || 0;
    }

    // 待办统计
    const todos = await prisma.todo.findMany({ where: { userId } });
    const todoCompleted = todos.filter((t) => t.status === "completed").length;
    const todoPending = todos.filter((t) => t.status === "pending").length;

    // 日程统计
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const events = await prisma.calendarEvent.findMany({
      where: { userId, status: { not: "cancelled" } },
      orderBy: { startTime: "asc" },
    });
    const upcomingEvents = events.filter((e) => new Date(e.startTime) >= now);
    const thisWeekEvents = events.filter(
      (e) => new Date(e.startTime) >= now && new Date(e.startTime) <= weekEnd,
    );

    res.json({
      data: {
        expenses: {
          total: Math.round(expenseTotal * 100) / 100,
          count: expenses.length,
          byType: Object.entries(expenseByType).map(([type, v]) => ({
            type,
            count: v.count,
            total: Math.round(v.total * 100) / 100,
          })),
        },
        todos: {
          total: todos.length,
          completed: todoCompleted,
          pending: todoPending,
          completionRate: todos.length > 0
            ? Math.round((todoCompleted / todos.length) * 100)
            : 0,
        },
        calendar: {
          total: events.length,
          upcoming: upcomingEvents.length,
          thisWeek: thisWeekEvents.map((e) => ({
            id: e.id,
            title: e.title,
            startTime: e.startTime.toISOString(),
            status: e.status,
          })),
        },
      },
      message: "ok",
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/notifications — 通知汇总 */
statsRoutes.get("/notifications", async (req, res, next) => {
  try {
    const userId = req.userId!;
    const now = new Date();

    // 逾期待办（dueDate < now 且 pending）
    const overdueTodos = await prisma.todo.findMany({
      where: {
        userId,
        status: "pending",
        dueDate: { lt: now },
      },
      orderBy: { dueDate: "asc" },
    });

    // 24h 内日程
    const dayEnd = new Date(now.getTime() + 24 * 3600 * 1000);
    const upcomingEvents = await prisma.calendarEvent.findMany({
      where: {
        userId,
        status: { not: "cancelled" },
        startTime: { gte: now, lte: dayEnd },
      },
      orderBy: { startTime: "asc" },
    });

    res.json({
      data: {
        total: overdueTodos.length + upcomingEvents.length,
        overdueTodos: overdueTodos.map((t) => ({
          id: t.id,
          title: t.title,
          dueDate: t.dueDate?.toISOString() || null,
          priority: t.priority,
        })),
        upcomingEvents: upcomingEvents.map((e) => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime.toISOString(),
        })),
      },
      message: "ok",
    });
  } catch (err) {
    next(err);
  }
});
