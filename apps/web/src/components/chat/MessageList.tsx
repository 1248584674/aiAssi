// ── 消息展示区（自动滚动）— Zapier 风格 ──
import { useEffect, useRef } from "react";
import { useChatStore } from "../../stores/chat-store.js";
import MessageBubble from "./MessageBubble.js";

export default function MessageList() {
  const { messages, isSending, currentSessionId } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 空状态 — 未选择会话
  if (!currentSessionId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-canvas-soft">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-mute">
              <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 12h8M10 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-sm font-medium text-body-mid">AI 企业效率助手</h2>
          <p className="mt-1 text-xs text-mute">
            选择会话或创建新会话开始
          </p>
        </div>
      </div>
    );
  }

  // 空消息 — 已选择会话但无消息
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-primary">
              <path d="M5 9l9 5 9-5M5 9v10l9 5 9-5V9M5 9l9-5 9 5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-sm font-medium text-ink">有什么可以帮你的？</h2>
          <p className="mt-1 text-xs text-body-mid">试试输入：</p>
          <div className="mt-3 space-y-2">
            <Suggestion text="明天下午三点约张三开产品评审会" />
            <Suggestion text="帮我报销昨天去机场的打车费128元" />
            <Suggestion text="帮我创建待办：周五前完成Q2报告" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 md:px-4 py-3 md:py-4">
      <div className="mx-auto max-w-2xl space-y-0.5 md:space-y-1">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* 发送中提示 */}
        {isSending && (
          <div className="flex items-center gap-2 py-2">
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-[11px] text-mute">AI 正在思考...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

/** 快捷建议 */
function Suggestion({ text }: { text: string }) {
  const { sendMessage, isSending, currentSessionId } = useChatStore();

  const handleClick = () => {
    if (!isSending && currentSessionId) {
      sendMessage(text);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isSending}
      className="block w-full rounded-xl border border-mute bg-canvas-soft px-3 py-2 text-left text-xs text-body transition hover:border-primary/30 hover:text-ink disabled:opacity-50"
    >
      {text}
    </button>
  );
}
