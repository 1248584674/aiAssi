// ── LLM Provider 接口定义 ──
import type { ZodSchema } from "zod";

/** 标准聊天消息格式（兼容 Claude / OpenAI） */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** LLM 调用结果 */
export interface LLMResult {
  /** 结构化输出（经过 Schema 校验） */
  data: Record<string, unknown>;
  /** 原始响应文本（用于日志） */
  raw: string;
}

/** LLM Provider 接口 —— Strategy Pattern */
export interface LLMProvider {
  /** 发送聊天请求，可选传入 Zod Schema 约束输出格式 */
  chat(messages: ChatMessage[], outputSchema?: ZodSchema): Promise<LLMResult>;
}
