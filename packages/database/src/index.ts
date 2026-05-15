// ── Prisma Client 单例导出 ──
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export * from "@prisma/client";