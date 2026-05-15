// ── 环境变量配置 ──
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 确保从项目根目录加载 .env（而非 apps/api/）
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const isProd = process.env.NODE_ENV === "production";

export const config = {
  /** 是否为生产模式 */
  isProduction: isProd,
  /** 绑定地址（生产模式绑定所有网卡，允许局域网访问） */
  bindAddress: isProd ? "0.0.0.0" : "127.0.0.1",
  port: parseInt(process.env.API_PORT || "3001", 10),
  /** CORS（生产模式允许所有来源） */
  corsOrigin: isProd ? true : (process.env.CORS_ORIGIN || "http://localhost:5173"),
  llm: {
    provider: process.env.LLM_PROVIDER || "claude",
    model: process.env.LLM_MODEL || "deepseek-chat",
    claudeApiKey: process.env.CLAUDE_API_KEY || "",
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    openaiBaseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  },
};
