// ── LLM Provider 工厂函数 ──
import type { LLMProvider } from "./llm.interface.js";
import { ClaudeProvider, isClaudeKeyValid } from "./claude-provider.js";
import { OpenAIProvider, isOpenAIKeyValid } from "./openai-provider.js";
import { MockLLMProvider } from "./mock-llm.js";

export interface LLMConfig {
  provider: "claude" | "openai" | "mock";
  claudeApiKey?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  model?: string;
}

/** 根据配置创建 LLM Provider 实例 */
export function createLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case "claude":
      if (!config.claudeApiKey || !isClaudeKeyValid(config.claudeApiKey)) {
        console.warn("⚠️ Claude API Key 无效，降级使用 Mock 模式");
        return new MockLLMProvider();
      }
      return new ClaudeProvider({
        apiKey: config.claudeApiKey,
        model: config.model,
      });

    case "openai":
      if (!config.openaiApiKey || !isOpenAIKeyValid(config.openaiApiKey)) {
        console.warn("⚠️ OpenAI API Key 无效，降级使用 Mock 模式");
        return new MockLLMProvider();
      }
      return new OpenAIProvider({
        apiKey: config.openaiApiKey,
        baseUrl: config.openaiBaseUrl,
        model: config.model || "gpt-4o",
      });

    case "mock":
    default:
      return new MockLLMProvider();
  }
}
