// ── Express 应用实例 ──
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { authMiddleware } from "./middleware/auth.js";
import { routes } from "./routes/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // 基础中间件
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());
  app.use(requestLogger);

  // JWT 认证中间件（仅跳过登录/注册和健康检查）
  app.use((req, res, next) => {
    if (req.path === "/api/health" ||
        req.path === "/api/v1/auth/login" ||
        req.path === "/api/v1/auth/register") {
      return next();
    }
    if (req.path.startsWith("/api")) {
      return authMiddleware(req, res, next);
    }
    next();
  });

  // API 路由
  app.use("/api/v1", routes);
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 生产模式：提供前端静态文件 + SPA fallback
  if (config.isProduction) {
    const distPath = path.resolve(__dirname, "../../web/dist");
    app.use(express.static(distPath));
    // SPA fallback：所有非 API 的 GET 请求返回 index.html
    app.use((req, res, next) => {
      if (req.method === "GET" && !req.path.startsWith("/api")) {
        res.sendFile(path.join(distPath, "index.html"));
      } else {
        next();
      }
    });
  }

  // 全局错误处理
  app.use(errorHandler);

  return app;
}