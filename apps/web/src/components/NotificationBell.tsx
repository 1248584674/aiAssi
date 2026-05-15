// ── 通知铃铛 — Zapier 风格 ──
import { useState, useEffect, useRef } from "react";

interface Notification {
  id: string;
  title: string;
  type: "overdue_todo" | "upcoming_event";
  time: string;
  priority?: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("/api/v1/stats/notifications", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((d) => {
        const items: Notification[] = [];
        for (const t of d.data.overdueTodos || []) {
          items.push({ id: t.id, title: t.title, type: "overdue_todo", time: t.dueDate, priority: t.priority });
        }
        for (const e of d.data.upcomingEvents || []) {
          items.push({ id: e.id, title: e.title, type: "upcoming_event", time: e.startTime });
        }
        setNotifications(items);
      })
      .catch(() => {});
  }, []);

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-7 w-7 items-center justify-center rounded-lg text-body-mid transition hover:bg-canvas-soft hover:text-ink"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1.5c-2 0-3.5 1.5-3.5 4v1.5L2 8.5v1h10v-1l-1.5-1.5V5.5C10.5 3 9 1.5 7 1.5z" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5.5 11a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white">
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>

      {/* 下拉面板 */}
      {open && (
        <div className="absolute right-0 top-9 w-72 rounded-xl border border-mute bg-canvas shadow-lg z-50">
          <div className="border-b border-mute px-4 py-2">
            <span className="text-xs font-semibold text-ink">通知</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-mute">暂无通知</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="flex items-start gap-2 px-4 py-2.5 hover:bg-canvas-soft transition border-b border-mute/30 last:border-0">
                  <div className={`mt-0.5 h-1.5 w-1.5 rounded-full shrink-0 ${n.type === "overdue_todo" ? "bg-red-500" : "bg-blue-500"}`} />
                  <div className="min-w-0">
                    <p className="text-[11px] text-ink-soft truncate">{n.title}</p>
                    <p className="text-[10px] text-mute mt-0.5">
                      {n.type === "overdue_todo" ? "已逾期" : "即将开始"} · {formatNotifTime(n.time)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatNotifTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}