// ── Agent Core 统一导出 ──

// LLM
export type { LLMProvider, ChatMessage, LLMResult } from "./llm/llm.interface.js";
export { ClaudeProvider, isClaudeKeyValid } from "./llm/claude-provider.js";
export { OpenAIProvider, isOpenAIKeyValid } from "./llm/openai-provider.js";
export { MockLLMProvider } from "./llm/mock-llm.js";
export { createLLMProvider } from "./llm/llm-factory.js";
export type { LLMConfig } from "./llm/llm-factory.js";

// Runtime
export { AgentRuntime, normalizeEntities, extractNegativeFields, buildFilledSummary, fieldLabel, parseRelativeDate } from "./runtime/agent-runtime.js";
export type { StreamEvent } from "./runtime/agent-runtime.js";
export { IntentRouter } from "./runtime/intent-router.js";
export { Planner } from "./runtime/planner.js";
export { Validator } from "./runtime/validator.js";
export type { ValidationResult } from "./runtime/validator.js";
export { Executor } from "./runtime/executor.js";
export type { ExecutionResult } from "./runtime/executor.js";
export { MemoryStore } from "./runtime/memory.js";

// Tools
export type { AgentTool } from "./tools/tool.interface.js";
export { ToolRegistry } from "./tools/tool-registry.js";
export { CalendarCreateDraftTool, CalendarConfirmEventTool, CalendarCheckConflictTool, CalendarListTool } from "./tools/calendar.tool.js";
export { ExpenseCreateDraftTool, ExpenseConfirmSubmitTool, ExpenseCheckFieldsTool, ExpenseListTool } from "./tools/expense.tool.js";
export { TodoCreateTool, TodoCompleteTool, TodoQueryTool } from "./tools/todo.tool.js";

// Logger
export { AgentLogger } from "./logger/agent-logger.js";

// Schemas
export { intentSchema } from "./schemas/intent.schema.js";
export type { IntentOutput } from "./schemas/intent.schema.js";
export { planSchema, planStepSchema } from "./schemas/plan.schema.js";
export type { PlanOutput } from "./schemas/plan.schema.js";
export { messageTypeSchema, messageRoleSchema } from "./schemas/message.schema.js";
