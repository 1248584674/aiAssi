// ── 用户认证路由 ──
import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { generateToken } from "../middleware/auth.js";

export const authRoutes = Router();

/** POST /api/v1/auth/register — 注册 */
authRoutes.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body as { name?: string; email?: string; password?: string };

    if (!name || !email || !password) {
      res.status(400).json({ data: null, message: "缺少 name / email / password" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ data: null, message: "密码至少 6 位" });
      return;
    }

    // 检查邮箱是否已注册
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ data: null, message: "该邮箱已注册" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    const token = generateToken(user.id);
    res.json({
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email },
      },
      message: "注册成功",
    });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/auth/login — 登录 */
authRoutes.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ data: null, message: "缺少 email / password" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      res.status(401).json({ data: null, message: "邮箱或密码错误" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ data: null, message: "邮箱或密码错误" });
      return;
    }

    const token = generateToken(user.id);
    res.json({
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email },
      },
      message: "登录成功",
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/auth/me — 获取当前用户信息 */
authRoutes.get("/me", async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ data: null, message: "未登录" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, department: true, role: true },
    });

    if (!user) {
      res.status(404).json({ data: null, message: "用户不存在" });
      return;
    }

    res.json({ data: { user }, message: "ok" });
  } catch (err) {
    next(err);
  }
});
