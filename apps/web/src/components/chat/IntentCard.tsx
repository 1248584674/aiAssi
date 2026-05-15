// ── 意图识别结果卡片 — Zapier 风格 ──
interface Props {
  metadata?: string | null;
}

export default function IntentCard({ metadata }: Props) {
  let intent = "unknown";
  let confidence = 0;
  let entities: Record<string, unknown> = {};

  try {
    if (metadata) {
      const parsed = JSON.parse(metadata);
      const intentData = parsed.intent || parsed;
      intent = intentData.intent || "unknown";
      confidence = intentData.confidence || 0;
      entities = intentData.entities || {};
    }
  } catch { /* ignore */ }

  const intentLabel = getIntentLabel(intent);

  return (
    <div className="my-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
      {/* 意图标签 */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-[11px] font-medium text-primary">
            {intentLabel}
          </span>
        </div>
        <span className="text-[10px] text-mute">
          置信度 {(confidence * 100).toFixed(0)}%
        </span>
      </div>

      {/* 实体列表 */}
      {Object.keys(entities).length > 0 && (
        <div className="space-y-1">
          {Object.entries(entities).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 text-body-mid">{entityLabel(key)}</span>
              <span className="text-ink-soft">
                {Array.isArray(val) ? val.join("、") : String(val)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getIntentLabel(intent: string): string {
  const map: Record<string, string> = {
    "calendar.create": "创建日程",
    "calendar.query": "查询日程",
    "calendar.update": "修改日程",
    "calendar.delete": "删除日程",
    "expense.create": "创建报销",
    "expense.query": "查询报销",
    "expense.submit": "提交报销",
    "todo.create": "创建待办",
    "todo.query": "查询待办",
    "todo.update": "更新待办",
    "todo.complete": "完成待办",
    "general.chat": "一般对话",
    unknown: "无法识别",
  };
  return map[intent] || intent;
}

function entityLabel(key: string): string {
  const map: Record<string, string> = {
    title: "标题",
    participants: "参与人",
    startTime: "开始时间",
    endTime: "结束时间",
    amount: "金额",
    expenseType: "费用类型",
    expenseDate: "日期",
    description: "说明",
    projectId: "项目",
    priority: "优先级",
    dueDate: "截止日期",
    assignee: "负责人",
    tags: "标签",
    date: "日期",
    timeOfDay: "时段",
  };
  return map[key] || key;
}
