// ── 聊天页面（响应式布局）— Zapier 风格 ──
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useChatStore } from "../stores/chat-store.js";
import SessionList from "../components/chat/SessionList.js";
import MessageList from "../components/chat/MessageList.js";
import ChatInput from "../components/chat/ChatInput.js";
import NotificationBell from "../components/NotificationBell.js";

export default function ChatPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { currentSessionId, selectSession } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (sessionId && sessionId !== currentSessionId) {
      selectSession(sessionId);
    }
  }, [sessionId]);

  return (
    <div className="flex h-screen bg-canvas text-ink">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-ink/30 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 左侧会话列表 — 桌面常显，移动端抽屉 */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 w-[270px] shrink-0 transition-transform
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <SessionList onSelect={() => setSidebarOpen(false)} />
      </div>

      {/* 右侧聊天区 */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* 顶部栏 */}
        <header className="flex items-center justify-between border-b border-mute px-3 md:px-6 py-3">
          <div className="flex items-center gap-2 md:gap-3">
            {/* 汉堡菜单（仅移动端） */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex md:hidden h-7 w-7 items-center justify-center rounded-lg text-body-mid hover:bg-canvas-soft"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 5h10M3 8h10M3 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-primary">
                <path d="M2.5 4.5l4.5 2.5 4.5-2.5M2.5 4.5v5l4.5 2.5 4.5-2.5v-5M2.5 4.5L7 2l4.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="hidden md:block">
              <h1 className="text-xs font-semibold text-ink">AI 企业效率助手</h1>
              <p className="text-[10px] text-body-mid">{currentSessionId ? "在线" : "就绪"}</p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 md:gap-1">
            <NotificationBell />

            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1 rounded-xl px-2 md:px-3 py-1.5 text-[11px] text-body-mid transition hover:bg-canvas-soft hover:text-ink"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="2" width="3" height="8" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
                <rect x="5.5" y="5" width="3" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
                <rect x="10" y="1" width="3" height="9" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              <span className="hidden md:inline">看板</span>
            </button>

            {currentSessionId && (
              <button
                onClick={() => navigate(`/logs/${currentSessionId}`)}
                className="flex items-center gap-1 rounded-xl px-2 md:px-3 py-1.5 text-[11px] text-body-mid transition hover:bg-canvas-soft hover:text-ink"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4 6h4M4 8h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span className="hidden md:inline">日志</span>
              </button>
            )}
          </div>
        </header>

        {/* 消息列表 */}
        <MessageList />

        {/* 底部输入框 */}
        <ChatInput />
      </div>
    </div>
  );
}