// ── JWT 认证中间件 ──
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ai-assistant-dev-secret";

/** 扩展 Express Request 类型 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/** JWT 认证中间件 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ data: null, message: "未登录" });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ data: null, message: "登录已过期，请重新登录" });
  }
}

/** 生成 JWT Token（7 天有效） */
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}
