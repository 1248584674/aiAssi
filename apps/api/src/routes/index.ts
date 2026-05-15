// ── 路由汇总 ──
import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { sessionRoutes } from "./session.routes.js";
import { agentRoutes } from "./agent.routes.js";
import { calendarRoutes } from "./calendar.routes.js";
import { expenseRoutes } from "./expense.routes.js";
import { todoRoutes } from "./todo.routes.js";
import { statsRoutes } from "./stats.routes.js";

export const routes = Router();

// 认证路由（无需登录）
routes.use("/auth", authRoutes);
// 统计路由
routes.use("/stats", statsRoutes);
// 业务路由（需登录，由全局 auth 中间件保护）
routes.use("/sessions", sessionRoutes);
routes.use("/agent", agentRoutes);
routes.use("/calendars", calendarRoutes);
routes.use("/expenses", expenseRoutes);
routes.use("/todos", todoRoutes);
