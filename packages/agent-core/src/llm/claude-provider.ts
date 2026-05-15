// ── Claude API Provider ──
import type { ZodSchema, ZodError } from "zod";
import type { ChatMessage, LLMProvider, LLMResult } from "./llm.interface.js";

interface ClaudeConfig {
  apiKey: string;
  model?: string;
}

export class ClaudeProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private baseUrl = "https://api.anthropic.com/v1/messages";

  constructor(config: ClaudeConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || "claude-sonnet-4-6";
  }

  async chat(messages: ChatMessage[], outputSchema?: ZodSchema): Promise<LLMResult> {
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    // 如果有 Schema，在 system prompt 中追加 JSON 格式要求
    let systemPrompt = systemMsg?.content || "";
    if (outputSchema) {
      systemPrompt += "\n\n你必须严格返回以下 JSON Schema 格式的 JSON，不要包含任何其他文字：\n" + JSON.stringify(outputSchema.shape || {}, null, 2);
    } else {
      systemPrompt += "\n\n请以 JSON 格式返回结果，不要包含任何其他文字。";
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: chatMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Claude API 调用失败 (${response.status}): ${errBody}`);
      }

      const json = await response.json();
      const rawText = json.content?.[0]?.text || "";

      try {
        // 尝试从响应中提取 JSON
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("响应中未找到 JSON");

        const parsed = JSON.parse(jsonMatch[0]);

        // Zod 校验
        if (outputSchema) {
          const validated = outputSchema.parse(parsed);
          return { data: validated as Record<string, unknown>, raw: rawText };
        }

        return { data: parsed, raw: rawText };
      } catch (err) {
        if (attempt === 2) {
          const zodErr = err as ZodError;
          throw new Error(`Claude 输出 JSON 校验失败（已重试3次）: ${zodErr.message || (err as Error).message}`);
        }
        // 重试
      }
    }

    throw new Error("Claude API 调用失败：超过最大重试次数");
  }
}

/** 判断 API Key 是否为占位符 */
export function isClaudeKeyValid(apiKey: string): boolean {
  return !!apiKey && !apiKey.startsWith("sk-ant-xxx") && apiKey.length > 20;
}
