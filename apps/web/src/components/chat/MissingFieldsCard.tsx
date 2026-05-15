// ── 缺失字段提示卡片 — Zapier 风格 ──
interface Props {
  message: string;
  metadata?: string | null;
}

export default function MissingFieldsCard({ message, metadata }: Props) {
  let missingFields: string[] = [];

  try {
    if (metadata) {
      const parsed = JSON.parse(metadata);
      missingFields = parsed.missingFields || [];
    }
  } catch { /* ignore */ }

  return (
    <div className="my-2 rounded-xl border border-amber-500/30 bg-amber-50 p-4">
      {/* 标题 */}
      <div className="mb-2 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" className="text-amber-500" />
          <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-amber-500" />
        </svg>
        <span className="text-xs font-medium text-amber-700">需要补充信息</span>
      </div>

      {/* 消息 */}
      <p className="mb-2 text-sm text-ink-soft">{message}</p>

      {/* 字段标签 */}
      {missingFields.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {missingFields.map((f) => (
            <span
              key={f}
              className="rounded-md border border-amber-500/20 bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700"
            >
              {fieldLabel(f)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function fieldLabel(field: string): string {
  const map: Record<string, string> = {
    title: "会议标题",
    startTime: "开始时间",
    endTime: "结束时间",
    amount: "金额",
    expenseType: "费用类型",
    expenseDate: "日期",
    projectId: "项目归属",
    invoiceFileIds: "发票文件",
    description: "说明",
    participants: "参与人",
    priority: "优先级",
    dueDate: "截止日期",
    assignee: "负责人",
  };
  return map[field] || field;
}
