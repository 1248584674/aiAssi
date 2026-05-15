// ── 请求日志中间件 ──
import type { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  const start = Date.now();
  console.log(`→ ${req.method} ${req.path}`);

  // 响应完成后记录耗时
  _res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`← ${req.method} ${req.path} ${_res.statusCode} (${ms}ms)`);
  });

  next();
}
