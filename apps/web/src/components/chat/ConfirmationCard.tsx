// ── 确认操作卡片 — Zapier 风格 ──
import { useState } from "react";
import { useChatStore } from "../../stores/chat-store.js";

interface Props {
  content: string;
  metadata?: string | null;
}

export default function ConfirmationCard({ content, metadata }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const { confirmAction } = useChatStore();

  let confirmationId = "";
  let payload: Record<string, unknown> = {};

  try {
    if (metadata) {
      const parsed = JSON.parse(metadata);
      confirmationId = parsed.confirmationId || "";
      payload = parsed.payload || {};
    }
  } catch { /* ignore */ }

  const handleConfirm = async (confirmed: boolean) => {
    if (!confirmationId || status !== "idle") return;
    setStatus("loading");
    await confirmAction(confirmationId, confirmed);
    setStatus("done");
  };

  if (status === "done") return null;

  // 提取冲突信息
  const conflicts = (payload.conflicts as Array<{ title: string; startTime: string; endTime: string }>) || [];

  return (
    <div className="my-2 rounded-xl border border-mute bg-canvas-soft p-4">
      {/* 标题 */}
      <div className="mb-3 flex items-center gap-2">
        {conflicts.length > 0 ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-amber-500">
            <path d="M8 2L1 14h14L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M8 7v3M8 12v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-primary">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span className="text-xs font-medium text-ink-soft">
          {conflicts.length > 0 ? "检测到时间冲突" : "请确认操作"}
        </span>
      </div>

      {/* 冲突列表 */}
      {conflicts.length > 0 && (
        <div className="mb-3 space-y-1.5">
          <p className="text-[11px] text-amber-600">以下日程与本次时间重叠：</p>
          {conflicts.map((c, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-ink-soft truncate">{c.title}</p>
                <p className="text-[10px] text-body-mid">{formatConflictTime(c.startTime, c.endTime)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 摘要 */}
      <pre className="mb-3 whitespace-pre-wrap rounded-lg bg-canvas px-3 py-2.5 text-xs leading-relaxed text-body font-mono border border-mute/60">
        {content}
      </pre>

      {/* 按钮 */}
      <div className="flex gap-2">
        <button
          onClick={() => handleConfirm(true)}
          disabled={status === "loading"}
          className={`flex-1 rounded-xl py-2 text-xs font-semibold text-white transition disabled:opacity-50 ${
            conflicts.length > 0 ? "bg-amber-500 hover:bg-amber-600" : "bg-primary hover:bg-primary-hover"
          }`}
        >
          {status === "loading" ? (
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="30 10" />
              </svg>
              处理中...
            </span>
          ) : conflicts.length > 0 ? (
            "仍然创建"
          ) : (
            "确认"
          )}
        </button>
        <button
          onClick={() => handleConfirm(false)}
          disabled={status === "loading"}
          className="rounded-xl border border-ink/20 bg-canvas px-4 py-2 text-xs text-body-mid transition hover:border-ink/40 hover:text-ink disabled:opacity-50"
        >
          取消
        </button>
      </div>
    </div>
  );
}

function formatConflictTime(start: string, end: string): string {
  try {
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    return `${fmt(new Date(start))} — ${fmt(new Date(end))}`;
  } catch {
    return "";
  }
}
