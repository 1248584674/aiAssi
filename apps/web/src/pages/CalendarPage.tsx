// ── 日程页面 — Zapier 风格 ──
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  participants: string | null;
  location?: string;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("/api/v1/calendars", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((d) => setEvents(d.data?.events || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 按日期分组
  const grouped = groupByDate(events);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex items-center justify-between border-b border-mute px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/chat")} className="text-xs text-body-mid hover:text-ink transition">← 返回</button>
          <h1 className="text-sm font-semibold text-ink">日程</h1>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-[11px] text-body-mid hover:text-ink transition"
        >
          看板
        </button>
      </header>

      <div className="mx-auto max-w-2xl px-4 md:px-6 py-6">
        {loading ? (
          <p className="text-center text-sm text-body-mid py-12">加载中...</p>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-canvas-soft">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-mute">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm text-body-mid">暂无日程</p>
            <p className="text-xs text-mute mt-1">去聊天页面创建第一个日程吧</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-ink-soft">{date}</span>
                  <div className="flex-1 h-px bg-mute" />
                </div>
                <div className="space-y-2">
                  {items.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-xl border border-mute bg-canvas-soft p-4 flex items-start gap-3 hover:border-ink/20 transition cursor-pointer"
                    >
                      {/* 时间列 */}
                      <div className="text-center shrink-0 w-14">
                        <p className="text-lg font-semibold text-ink leading-none">{formatDay(e.startTime)}</p>
                        <p className="text-[10px] text-body-mid mt-0.5">{formatWeekday(e.startTime)}</p>
                      </div>

                      {/* 竖线 */}
                      <div className={`w-0.5 self-stretch rounded-full shrink-0 ${
                        e.status === "confirmed" ? "bg-primary" : e.status === "cancelled" ? "bg-mute" : "bg-amber-400"
                      }`} />

                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-ink truncate">{e.title}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                            e.status === "confirmed" ? "bg-emerald-100 text-emerald-700" :
                            e.status === "cancelled" ? "bg-zinc-100 text-zinc-500" :
                            "bg-amber-100 text-amber-700"
                          }`}>
                            {e.status === "confirmed" ? "已确认" : e.status === "cancelled" ? "已取消" : "草稿"}
                          </span>
                        </div>
                        <p className="text-[11px] text-body-mid mt-1">
                          {formatTimeRange(e.startTime, e.endTime)}
                        </p>
                        {e.participants && (
                          <p className="text-[11px] text-mute mt-0.5">
                            {formatParticipants(e.participants)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 工具函数 ──

function groupByDate(events: Event[]): Record<string, Event[]> {
  const groups: Record<string, Event[]> = {};
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split("T")[0];

  for (const e of events) {
    const d = e.startTime.split("T")[0];
    let label: string;
    if (d === today) label = "今天";
    else if (d === tomorrow) label = "明天";
    else label = `${new Date(d).getMonth() + 1}月${new Date(d).getDate()}日`;

    if (!groups[label]) groups[label] = [];
    groups[label].push(e);
  }
  return groups;
}

function formatDay(iso: string): string {
  return String(new Date(iso).getDate());
}

function formatWeekday(iso: string): string {
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][new Date(iso).getDay()];
}

function formatTimeRange(start: string, end: string): string {
  const fmt = (d: Date) => `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  return `${fmt(new Date(start))} — ${fmt(new Date(end))}`;
}

function formatParticipants(raw: string): string {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.join("、") : raw;
  } catch {
    return raw;
  }
}