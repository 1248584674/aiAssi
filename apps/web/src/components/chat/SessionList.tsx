// ── 会话列表（左侧栏）— Zapier 风格 ──
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useChatStore } from "../../stores/chat-store.js";

export default function SessionList({ onSelect }: { onSelect?: () => void }) {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { sessions, currentSessionId, loadSessions, createSession, selectSession } =
    useChatStore();

  useEffect(() => {
    loadSessions();
  }, []);

  const handleNewSession = async () => {
    const id = await createSession();
    navigate(`/chat/${id}`);
  };

  const handleSelect = (id: string) => {
    selectSession(id);
    navigate(`/chat/${id}`);
    onSelect?.();
  };

  return (
    <aside className="flex h-full flex-col border-r border-mute bg-canvas-soft">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-mute/60 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-body-mid">
          会话
        </span>
        <button
          onClick={handleNewSession}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink/20 bg-canvas text-body-mid transition hover:border-primary hover:text-primary"
          title="新建会话"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-canvas text-mute">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h10M3 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-xs text-body-mid">暂无会话</p>
            <p className="mt-1 text-[11px] text-mute">点击 + 开始新对话</p>
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelect(s.id)}
                className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                  (sessionId || currentSessionId) === s.id
                    ? "bg-primary/10 text-primary"
                    : "text-body hover:bg-canvas hover:text-ink"
                }`}
              >
                <div className="truncate text-xs font-medium">
                  {s.title || "新会话"}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-mute">
                  <span>{formatTime(s.updatedAt || s.createdAt)}</span>
                  {s.taskStatus === "active" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;

  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}/${day}`;
}
