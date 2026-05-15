// ── Axios API 客户端 ──
import axios from "axios";

const client = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

/** 请求拦截：附加 JWT Token */
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** 响应拦截：401 → 清除 token → 跳转登录 */
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/auth";
      return Promise.reject(err);
    }
    const message = err.response?.data?.message || err.message || "网络请求失败";
    console.error("API 错误:", message);
    return Promise.reject(err);
  },
);

// ── API 方法 ──

export interface Session {
  id: string;
  title?: string;
  currentIntent?: string;
  taskStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  type: string;
  content: string;
  metadata?: string | null;
  createdAt: string;
}

export interface ToolCall {
  id: string;
  sessionId: string;
  stepId?: string;
  toolName: string;
  inputJson: string;
  outputJson?: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

export interface AgentResponseData {
  type: string;
  message?: string;
  missingFields?: string[];
  confirmationId?: string;
  summary?: string;
  payload?: unknown;
  results?: unknown[];
  code?: string;
  intent?: { intent: string; confidence: number; entities: Record<string, unknown> };
}

/** 创建新会话 */
export function createSession(): Promise<{ sessionId: string; createdAt: string }> {
  return client.post("/sessions").then((r) => r.data.data);
}

/** 获取会话列表 */
export function getSessions(): Promise<{ sessions: Session[] }> {
  return client.get("/sessions").then((r) => r.data.data);
}

/** 发送消息给 Agent */
export function sendAgentMessage(
  sessionId: string,
  message: string,
): Promise<AgentResponseData> {
  return client
    .post("/agent/chat", { sessionId, message })
    .then((r) => r.data.data as AgentResponseData);
}

/** 获取会话消息历史 */
export function getSessionMessages(sessionId: string): Promise<{ messages: Message[] }> {
  return client.get(`/agent/sessions/${sessionId}/messages`).then((r) => r.data.data);
}

/** 获取工具调用日志 */
export function getToolCalls(sessionId: string): Promise<{ toolCalls: ToolCall[] }> {
  return client.get(`/agent/sessions/${sessionId}/tool-calls`).then((r) => r.data.data);
}

/** SSE 流事件回调 */
export interface StreamCallbacks {
  onEvent: (event: { type: string; data?: Record<string, unknown>; text?: string }) => void;
  onDone: (finalData: AgentResponseData) => void;
  onError: (error: string) => void;
}

/** Token 级流式发送消息给 Agent */
export function sendAgentMessageTokenStream(
  sessionId: string,
  message: string,
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();
  const token = localStorage.getItem("token");

  fetch("/api/v1/agent/chat/tokens", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ sessionId, message }),
    signal: controller.signal,
  }).then(async (response) => {
    if (!response.ok) {
      callbacks.onError(`HTTP ${response.status}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { callbacks.onError("无法读取响应流"); return; }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "token") {
                callbacks.onEvent({ type: "token", text: event.text } as any);
              } else if (event.type === "done") {
                callbacks.onDone(event.data);
              } else {
                callbacks.onEvent(event);
              }
            } catch { /* 跳过 */ }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        callbacks.onError((err as Error).message);
      }
    }
  }).catch((err) => {
    if (err.name !== "AbortError") callbacks.onError(err.message);
  });

  return controller;
}

/** 流式发送消息给 Agent */
export function sendAgentMessageStream(
  sessionId: string,
  message: string,
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();

  const token = localStorage.getItem("token");
  fetch("/api/v1/agent/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ sessionId, message }),
    signal: controller.signal,
  }).then(async (response) => {
    if (!response.ok) {
      callbacks.onError(`HTTP ${response.status}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError("无法读取响应流");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "done") {
                callbacks.onDone(event.data as AgentResponseData);
              } else {
                callbacks.onEvent(event);
              }
            } catch { /* JSON 解析失败，跳过 */ }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        callbacks.onError((err as Error).message);
      }
    }
  }).catch((err) => {
    if (err.name !== "AbortError") {
      callbacks.onError(err.message);
    }
  });

  return controller;
}

/** 确认/取消操作 */
export function confirmAction(
  confirmationId: string,
  confirmed: boolean,
): Promise<AgentResponseData> {
  return client
    .post("/agent/confirm", { confirmationId, confirmed })
    .then((r) => r.data.data as AgentResponseData);
}
