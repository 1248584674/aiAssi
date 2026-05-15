// ── 数据看板 — Zapier 风格 ──
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface StatsData {
  expenses: { total: number; count: number; byType: { type: string; count: number; total: number }[] };
  todos: { total: number; completed: number; pending: number; completionRate: number };
  calendar: { total: number; upcoming: number; thisWeek: { id: string; title: string; startTime: string }[] };
}

const TYPE_LABELS: Record<string, string> = { transport: "交通", hotel: "住宿", meal: "餐费", office: "办公", travel: "差旅", other: "其他" };
const TYPE_COLORS: Record<string, string> = { transport: "#ff4f00", hotel: "#f59e0b", meal: "#10b981", office: "#6366f1", travel: "#ec4899", other: "#939084" };

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("/api/v1/stats", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((d) => setStats(d.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-canvas"><p className="text-body-mid text-sm">加载中...</p></div>;
  if (!stats) return <div className="flex min-h-screen items-center justify-center bg-canvas"><p className="text-red-500 text-sm">加载失败</p></div>;

  const maxExpense = Math.max(...stats.expenses.byType.map((t) => t.total), 1);

  return (
    <div className="min-h-screen bg-canvas">
      {/* 顶部栏 */}
      <header className="flex items-center justify-between border-b border-mute px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/chat")} className="text-xs text-body-mid hover:text-ink transition">← 返回</button>
          <h1 className="text-sm font-semibold text-ink">数据看板</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* 摘要卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <SummaryCard label="本月报销" value={`¥${stats.expenses.total}`} sub={`${stats.expenses.count} 笔`} color="#ff4f00" />
          <SummaryCard label="待办完成率" value={`${stats.todos.completionRate}%`} sub={`${stats.todos.pending} 个待处理`} color="#10b981" />
          <SummaryCard label="近期日程" value={`${stats.calendar.upcoming}`} sub={`共 ${stats.calendar.total} 条`} color="#6366f1" />
        </div>

        {/* 图表: 报销分布 + 待办状态 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {/* 报销类型柱状图 */}
          <div className="rounded-xl border border-mute bg-canvas-soft p-5">
            <h3 className="text-xs font-semibold text-ink mb-4">报销类型分布</h3>
            {stats.expenses.byType.length === 0 ? (
              <p className="text-xs text-mute">暂无数据</p>
            ) : (
              <div className="space-y-2">
                {stats.expenses.byType.map((t) => (
                  <div key={t.type} className="flex items-center gap-2">
                    <span className="w-12 text-[10px] text-body-mid shrink-0">{TYPE_LABELS[t.type] || t.type}</span>
                    <div className="flex-1 h-5 bg-canvas rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(t.total / maxExpense) * 100}%`, backgroundColor: TYPE_COLORS[t.type] || TYPE_COLORS.other }}
                      />
                    </div>
                    <span className="text-[10px] text-ink-soft w-14 text-right">¥{t.total}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 待办饼图 */}
          <div className="rounded-xl border border-mute bg-canvas-soft p-5">
            <h3 className="text-xs font-semibold text-ink mb-4">待办状态</h3>
            {stats.todos.total === 0 ? (
              <p className="text-xs text-mute">暂无数据</p>
            ) : (
              <div className="flex items-center gap-6">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <PieSlice
                    completed={stats.todos.completed}
                    pending={stats.todos.pending}
                  />
                </svg>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-body-mid">已完成</span>
                    <span className="text-ink-soft font-medium">{stats.todos.completed}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-body-mid">待处理</span>
                    <span className="text-ink-soft font-medium">{stats.todos.pending}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 本周日程 */}
        <div className="rounded-xl border border-mute bg-canvas-soft p-5">
          <h3 className="text-xs font-semibold text-ink mb-3">本周日程</h3>
          {stats.calendar.thisWeek.length === 0 ? (
            <p className="text-xs text-mute">本周暂无日程</p>
          ) : (
            <div className="space-y-1.5">
              {stats.calendar.thisWeek.map((e) => (
                <div key={e.id} className="flex items-center gap-3 rounded-lg bg-canvas px-3 py-2 border border-mute/50">
                  <div className="text-[10px] text-body-mid w-16 shrink-0">
                    {formatShortDate(e.startTime)}
                  </div>
                  <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-xs text-ink-soft truncate">{e.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-xl border border-mute bg-canvas-soft p-4">
      <p className="text-[10px] text-body-mid">{label}</p>
      <p className="text-xl font-semibold text-ink mt-1" style={{ color }}>{value}</p>
      <p className="text-[10px] text-mute mt-0.5">{sub}</p>
    </div>
  );
}

function PieSlice({ completed, pending }: { completed: number; pending: number }) {
  const total = completed + pending || 1;
  const completedAngle = (completed / total) * 360;
  const cx = 50, cy = 50, r = 35;

  if (pending === 0) {
    return <circle cx={cx} cy={cy} r={r} fill="#10b981" />;
  }
  if (completed === 0) {
    return <circle cx={cx} cy={cy} r={r} fill="#f59e0b" />;
  }

  const rad = (completedAngle * Math.PI) / 180;
  const x = cx + r * Math.sin(rad);
  const y = cy - r * Math.cos(rad);
  const largeArc = completedAngle > 180 ? 1 : 0;

  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="#f59e0b" />
      <path d={`M${cx},${cy} L${cx},${cy - r} A${r},${r} 0 ${largeArc},1 ${x},${y} Z`} fill="#10b981" />
    </>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${["日","一","二","三","四","五","六"][d.getDay()]}`;
}
