// ── 日程管理路由 ──
import { Router } from "express";
import { prisma } from "../db.js";

export const calendarRoutes = Router();

/** GET /api/v1/calendars — 获取用户日程列表 */
calendarRoutes.get("/", async (req, res, next) => {
  try {
    const userId = req.userId as string;
    if (!userId) {
      res.status(400).json({ data: null, message: "缺少 x-user-id header" });
      return;
    }

    const events = await prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: { startTime: "asc" },
    });

    res.json({ data: { events }, message: "ok" });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/calendars/:id — 获取单个日程详情 */
calendarRoutes.get("/:id", async (req, res, next) => {
  try {
    const event = await prisma.calendarEvent.findUnique({
      where: { id: req.params.id },
    });

    if (!event) {
      res.status(404).json({ data: null, message: "日程不存在" });
      return;
    }

    res.json({ data: { event }, message: "ok" });
  } catch (err) {
    next(err);
  }
});
