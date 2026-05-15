// ── AI 企业效率 Agent — 共享类型、常量、工具函数 ──

// ============================================================
// 消息类型定义
// ============================================================
export type MessageRole = "user" | "assistant" | "system";

export type MessageType =
  | "text"
  | "intent_result"
  | "missing_fields"
  | "confirmation"
  | "tool_result"
  | "error";

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ============================================================
// 意图定义
// ============================================================
export type Intent =
  | "calendar.create"
  | "calendar.update"
  | "calendar.query"
  | "calendar.delete"
  | "expense.create"
  | "expense.query"
  | "expense.update"
  | "expense.submit"
  | "todo.create"
  | "todo.query"
  | "todo.update"
  | "todo.complete"
  | "general.chat"
  | "unknown";

export interface IntentResult {
  intent: Intent;
  confidence: number;
  entities: Record<string, unknown>;
}

// ============================================================
// Agent 响应类型
// ============================================================
export type AgentResponse =
  | { type: "text"; message: string }
  | { type: "intent_result"; intent: IntentResult }
  | { type: "missing_fields"; message: string; missingFields: string[] }
  | { type: "confirmation"; confirmationId: string; summary: string; payload: unknown }
  | { type: "tool_result"; results: ToolCallRecord[] }
  | { type: "error"; code: string; message: string; detail?: unknown };

// ============================================================
// 计划相关
// ============================================================
export interface PlanStep {
  stepId: string;
  action: string;
  tool: string | null;
  description: string;
}

export interface Plan {
  goal: string;
  intent: string;
  steps: PlanStep[];
}

// ============================================================
// 工具调用记录
// ============================================================
export interface ToolCallRecord {
  id: string;
  sessionId: string;
  stepId?: string;
  toolName: string;
  inputJson: Record<string, unknown>;
  outputJson?: Record<string, unknown>;
  status: "success" | "failed";
  errorMessage?: string;
  createdAt: string;
}

// ============================================================
// 会话上下文
// ============================================================
export interface SessionContext {
  intent?: string;
  entities?: Record<string, unknown>;
  missingFields?: string[];
  draftData?: Record<string, unknown>;
  currentStep?: string;
  confirmedActions: string[];
}

// ============================================================
// 确认请求
// ============================================================
export interface ConfirmationRequest {
  id: string;
  sessionId: string;
  action: string;
  summary: string;
  payload: Record<string, unknown>;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
}

// ============================================================
// 常量
// ============================================================
/** 需要用户确认的操作类型 */
export const HIGH_RISK_ACTIONS = [
  "calendar.confirmEvent",
  "expense.confirmSubmit",
] as const;

/** 费用类型中文映射 */
export const EXPENSE_TYPE_LABELS: Record<string, string> = {
  transport: "交通费",
  hotel: "住宿费",
  meal: "餐费",
  office: "办公费",
  travel: "差旅费",
  other: "其他",
};

/** 日程创建必填字段 */
export const CALENDAR_REQUIRED_FIELDS = ["title", "startTime", "endTime"];

/** 报销创建必填字段 */
export const EXPENSE_REQUIRED_FIELDS = ["expenseType", "amount", "expenseDate"];

/** 待办创建必填字段 */
export const TODO_REQUIRED_FIELDS = ["title"];

/** 任务优先级中文映射 */
export const PRIORITY_LABELS: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "紧急",
};