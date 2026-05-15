// ── 全局错误处理中间件 ──
import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("❌ 未捕获错误:", err.message);
  res.status(500).json({
    data: null,
    message: "服务器内部错误",
    error: { code: "INTERNAL_ERROR", detail: err.message },
  });
}
