// ── 数据库 Seed 脚本：创建测试用户（默认密码 123456） ──
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 开始填充测试数据...");

  const passwordHash = await bcrypt.hash("123456", 10);

  const zhangsan = await prisma.user.upsert({
    where: { email: "zhangsan@example.com" },
    update: { passwordHash },
    create: {
      name: "张三",
      email: "zhangsan@example.com",
      department: "产品部",
      role: "employee",
      passwordHash,
    },
  });

  const lisi = await prisma.user.upsert({
    where: { email: "lisi@example.com" },
    update: { passwordHash },
    create: {
      name: "李四",
      email: "lisi@example.com",
      department: "技术部",
      role: "manager",
      passwordHash,
    },
  });

  const wangwu = await prisma.user.upsert({
    where: { email: "wangwu@example.com" },
    update: { passwordHash },
    create: {
      name: "王五",
      email: "wangwu@example.com",
      department: "财务部",
      role: "admin",
      passwordHash,
    },
  });

  console.log("✅ 测试用户创建完成:");
  console.log(`   ${zhangsan.name} (${zhangsan.id}) - ${zhangsan.role} | 密码: 123456`);
  console.log(`   ${lisi.name} (${lisi.id}) - ${lisi.role} | 密码: 123456`);
  console.log(`   ${wangwu.name} (${wangwu.id}) - ${wangwu.role} | 密码: 123456`);
}

main()
  .catch((e) => {
    console.error("❌ Seed 失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
