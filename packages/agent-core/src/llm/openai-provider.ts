// ── OpenAI Compatible API Provider ──
import type { ZodSchema, ZodError } from "zod";
import type { ChatMessage, LLMProvider, LLMResult } from "./llm.interface.js";

interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://api.openai.com/v1";
    this.model = config.model || "gpt-4o";
  }

  async chat(messages: ChatMessage[], outputSchema?: ZodSchema): Promise<LLMResult> {
    // 若有 Schema，将格式要求注入到 system prompt 中
    // 使用 json_object 模式保持与 DeepSeek 等兼容 API 的最大兼容性
    const systemIdx = messages.findIndex((m) => m.role === "system");
    if (outputSchema && systemIdx >= 0) {
      const schemaJson = this.zodToJsonSchema(outputSchema);
      messages = messages.map((m, i) =>
        i === systemIdx
          ? { ...m, content: m.content + "\n\n你必须严格返回以下 JSON Schema 格式的 JSON，不要包含任何其他文字：\n" + JSON.stringify(schemaJson.properties || {}, null, 2) }
          : m
      );
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const body: Record<string, unknown> = {
        model: this.model,
        messages,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`OpenAI API 调用失败 (${response.status}): ${errBody}`);
      }

      const json = await response.json();
      const rawText = json.choices?.[0]?.message?.content || "";

      try {
        const parsed = JSON.parse(rawText);

        if (outputSchema) {
          const validated = outputSchema.parse(parsed);
          return { data: validated as Record<string, unknown>, raw: rawText };
        }

        return { data: parsed, raw: rawText };
      } catch (err) {
        if (attempt === 2) {
          const zodErr = err as ZodError;
          throw new Error(`OpenAI 输出 JSON 校验失败（已重试3次）: ${zodErr.message || (err as Error).message}`);
        }
      }
    }

    throw new Error("OpenAI API 调用失败：超过最大重试次数");
  }

  /** 流式聊天 —— 逐 token yield */
  async *chatStream(
    messages: ChatMessage[],
    outputSchema?: ZodSchema,
  ): AsyncGenerator<string> {
    // Schema 注入到 system prompt（同 chat 方法）
    const systemIdx = messages.findIndex((m) => m.role === "system");
    if (outputSchema && systemIdx >= 0) {
      const schemaJson = this.zodToJsonSchema(outputSchema);
      messages = messages.map((m, i) =>
        i === systemIdx
          ? { ...m, content: m.content + "\n\n你必须严格返回以下 JSON Schema 格式的 JSON，不要包含任何其他文字：\n" + JSON.stringify(schemaJson.properties || {}, null, 2) }
          : m
      );
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: 1024,
        stream: true,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`API 调用失败 (${response.status}): ${errBody}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("无法读取响应流");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") return;

        try {
          const json = JSON.parse(data);
          const chunk = json.choices?.[0]?.delta?.content || "";
          if (chunk) yield chunk;
        } catch { /* 跳过无法解析的行 */ }
      }
    }
  }

  /** 将 Zod Schema 转换为 JSON Schema（简化版） */
  private zodToJsonSchema(schema: ZodSchema): Record<string, unknown> {
    // Zod 3.22+ 支持 zodToJsonSchema
    try {
      const { zodToJsonSchema } = require("zod-to-json-schema");
      return zodToJsonSchema(schema);
    } catch {
      // 回退：返回基础 JSON Schema
      return {
        type: "object",
        properties: {},
        additionalProperties: false,
      };
    }
  }
}

/** 判断 API Key 是否有效 */
export function isOpenAIKeyValid(apiKey: string): boolean {
  return !!apiKey && !apiKey.startsWith("sk-xxx") && apiKey.length > 20;
}
