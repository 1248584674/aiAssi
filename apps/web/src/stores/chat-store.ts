// ── 聊天状态管理（Zustand） ──
import { create } from "zustand";
import type { Session, Message, AgentResponseData } from "../api/client.js";
import * as api from "../api/client.js";

interface ChatStore {
  // 状态
  sessions: Session[];
  currentSessionId: string | null;
  messages: Message[];
  isSending: boolean;
  error: string | null;

  // 操作
  loadSessions: () => Promise<void>;
  createSession: () => Promise<string>;
  selectSession: (id: string) => void;
  sendMessage: (text: string) => Promise<void>;
  confirmAction: (confirmationId: string, confirmed: boolean) => Promise<void>;
  loadMessages: (sessionId: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  isSending: false,
  error: null,

  /** 加载会话列表 */
  loadSessions: async () => {
    try {
      const { sessions } = await api.getSessions();
      set({ sessions });
    } catch (err) {
      console.error("加载会话列表失败:", err);
    }
  },

  /** 创建新会话 */
  createSession: async () => {
    const { sessionId } = await api.createSession();
    await get().loadSessions();
    return sessionId;
  },

  /** 选择会话并加载消息 */
  selectSession: async (id: string) => {
    set({ currentSessionId: id, messages: [], error: null });
    await get().loadMessages(id);
  },

  /** 加载会话消息 */
  loadMessages: async (sessionId: string) => {
    try {
      const { messages } = await api.getSessionMessages(sessionId);
      set({ messages });
    } catch (err) {
      console.error("加载消息失败:", err);
    }
  },

  /** 发送消息（流式） */
  sendMessage: async (text: string) => {
    const { currentSessionId, messages } = get();
    if (!currentSessionId || !text.trim()) return;

    // 在本地先添加用户消息
    const userMsg: Message = {
      id: `local_${Date.now()}`,
      sessionId: currentSessionId,
      role: "user",
      type: "text",
      content: text,
      createdAt: new Date().toISOString(),
    };

    // 添加占位 AI 消息（流式更新）
    const streamMsgId = `stream_${Date.now()}`;
    const streamMsg: Message = {
      id: streamMsgId,
      sessionId: currentSessionId,
      role: "assistant",
      type: "text",
      content: "正在分析...",
      createdAt: new Date().toISOString(),
    };

    set({ messages: [...messages, userMsg, streamMsg], isSending: true, error: null });

    // Token 级流式（逐字输出）
    api.sendAgentMessageTokenStream(currentSessionId, text, {
      onEvent: (event) => {
        if (event.type === "token" && event.text) {
          // 逐字追加到消息内容
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === streamMsgId
                ? { ...m, type: "text", content: (m.content === "正在分析..." ? "" : m.content) + event.text }
                : m
            ),
          }));
        } else {
          // 其他阶段事件：更新状态文本
          const statusText = streamEventToText(event as any);
          if (statusText) {
            set((s) => ({
              messages: s.messages.map((m) =>
                m.id === streamMsgId ? { ...m, content: statusText } : m
              ),
            }));
          }
        }
      },
      onDone: (finalData) => {
        const aiMsg = responseToMessage(finalData, currentSessionId);
        aiMsg.id = streamMsgId; // 复用流式消息 ID，直接替换
        set((s) => ({
          messages: s.messages.map((m) => (m.id === streamMsgId ? aiMsg : m)),
          isSending: false,
        }));
      },
      onError: (error) => {
        const errMsg: Message = {
          id: streamMsgId,
          sessionId: currentSessionId,
          role: "system",
          type: "error",
          content: error,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          messages: s.messages.map((m) => (m.id === streamMsgId ? errMsg : m)),
          isSending: false,
          error: error,
        }));
      },
    });
  },

  /** 确认/取消操作 */
  confirmAction: async (confirmationId: string, confirmed: boolean) => {
    const { currentSessionId, messages } = get();
    if (!currentSessionId) return;

    set({ isSending: true });

    try {
      const response = await api.confirmAction(confirmationId, confirmed);
      const aiMsg = responseToMessage(response, currentSessionId);
      set((s) => ({
        messages: [...s.messages, aiMsg],
        isSending: false,
      }));
    } catch (err) {
      set({
        isSending: false,
        error: err instanceof Error ? err.message : "操作失败",
      });
    }
  },
}));

/** 将 AgentResponse 转为前端 Message */
function responseToMessage(resp: AgentResponseData, sessionId: string): Message {
  let content = "";
  let type = resp.type;
  let metadata: Record<string, unknown> | undefined;

  switch (resp.type) {
    case "text":
      content = resp.message || "";
      break;
    case "missing_fields":
      content = resp.message || "";
      metadata = { missingFields: resp.missingFields };
      break;
    case "confirmation":
      content = resp.summary || "";
      metadata = { confirmationId: resp.confirmationId, payload: resp.payload };
      break;
    case "intent_result":
      content = JSON.stringify(resp.intent);
      metadata = { intent: resp.intent };
      break;
    case "tool_result":
      content = "工具执行完成";
      metadata = { results: resp.results };
      break;
    case "error":
      content = resp.message || "发生错误";
      break;
    default:
      content = JSON.stringify(resp);
  }

  return {
    id: `ai_${Date.now()}`,
    sessionId,
    role: "assistant",
    type,
    content,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
    createdAt: new Date().toISOString(),
  };
}

/** 将流事件转为用户可见的状态文本 */
function streamEventToText(event: { type: string; data: Record<string, unknown> }): string {
  switch (event.type) {
    case "user_message":
      return "已收到消息，开始处理...";
    case "intent_start":
      return "正在理解您的意图...";
    case "intent_result": {
      const d = event.data as { intent?: string; confidence?: number };
      const labels: Record<string, string> = {
        "calendar.create": "创建日程",
        "expense.create": "创建报销",
        "todo.create": "创建待办",
        "todo.query": "查询待办",
      };
      return `识别意图：${labels[d.intent || ""] || d.intent || "分析中"}（${((d.confidence || 0) * 100).toFixed(0)}%）`;
    }
    case "plan":
      return "生成执行计划...";
    case "validation_start":
      return "校验信息完整性...";
    case "validation_result": {
      const d = event.data as { valid?: boolean; missingFields?: string[] };
      if (d.valid) return "信息校验通过，开始执行...";
      return `检测到缺失字段：${(d.missingFields || []).join("、")}`;
    }
    case "execution_start":
      return "正在执行操作...";
    case "tool_result": {
      const d = event.data as { toolName?: string; status?: string };
      if (d.status === "success") return `工具 ${d.toolName} 执行完成`;
      return `工具 ${d.toolName} 执行失败`;
    }
    default:
      return "";
  }
}
