// ── 消息气泡（按 type 分发渲染）— Zapier 风格 ──
import type { Message } from "../../api/client.js";
import IntentCard from "./IntentCard.js";
import MissingFieldsCard from "./MissingFieldsCard.js";
import ConfirmationCard from "./ConfirmationCard.js";

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const { role, type, content, metadata } = message;

  // 系统消息（错误等）
  if (role === "system") {
    return (
      <div className="my-1 flex justify-center">
        <div className={`rounded-lg px-3 py-1.5 text-[11px] ${
          type === "error"
            ? "bg-red-500/10 text-red-600 border border-red-500/20"
            : "bg-canvas-soft text-body-mid"
        }`}>
          {content}
        </div>
      </div>
    );
  }

  // 用户消息 — 橙色气泡
  if (role === "user") {
    return (
      <div className="my-2 flex justify-end">
        <div className="max-w-[85%] md:max-w-[75%] rounded-xl rounded-br-sm bg-primary px-3 md:px-4 py-2 md:py-2.5">
          <p className="text-sm leading-relaxed text-white">{content}</p>
        </div>
      </div>
    );
  }

  // 助手消息 —— 按 type 分发
  return (
    <div className="my-2 flex justify-start">
      <div className="max-w-[90%] md:max-w-[80%]">
        {type === "intent_result" && <IntentCard metadata={metadata} />}
        {type === "missing_fields" && (
          <MissingFieldsCard message={content} metadata={metadata} />
        )}
        {type === "confirmation" && (
          <ConfirmationCard content={content} metadata={metadata} />
        )}
        {type === "tool_result" && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-emerald-600">执行完成</span>
            </div>
            {renderToolResults(metadata)}
            {renderQueryResults(metadata)}
          </div>
        )}
        {/* 普通文本 */}
        {(type === "text" || !type) && (
          <div className="rounded-xl rounded-bl-sm bg-canvas-soft px-4 py-2.5 border border-mute/60">
            <p className="text-sm leading-relaxed text-body whitespace-pre-wrap">
              {content}
            </p>
          </div>
        )}
        {/* 错误 */}
        {type === "error" && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5">
            <p className="text-sm text-red-600">{content}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** 渲染工具调用结果 */
function renderToolResults(metadata?: string | null) {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata);
    const results = parsed.results || [];
    if (!Array.isArray(results) || results.length === 0) return null;

    return (
      <div className="space-y-1 mt-2">
        {results.map((r: Record<string, unknown>, i: number) => (
          <div key={i} className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700">
            <span className="font-mono text-emerald-600">{r.toolName as string}</span>
            {r.status === "failed" && (
              <span className="ml-2 text-red-600">{r.errorMessage as string}</span>
            )}
          </div>
        ))}
      </div>
    );
  } catch {
    return null;
  }
}

/** 渲染查询结果（日程/报销/待办列表） */
function renderQueryResults(metadata?: string | null) {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata);
    const results = parsed.results || [];
    if (!Array.isArray(results) || results.length === 0) return null;

    return (
      <div className="space-y-2 mt-2">
        {results.map((r: Record<string, unknown>, i: number) => {
          const output = (r.outputJson || {}) as Record<string, unknown>;

          // 日程列表
          if (Array.isArray(output.events) && output.events.length > 0) {
            return (
              <div key={i} className="space-y-1.5">
                <p className="text-[11px] font-medium text-body-mid">{output.message as string}：</p>
                {(output.events as Array<Record<string, string>>).map((e, j) => (
                  <div key={j} className="rounded-lg bg-canvas px-3 py-2 border border-mute/50">
                    <p className="text-xs font-medium text-ink">{e.title}</p>
                    <p className="text-[10px] text-body-mid mt-0.5">
                      {formatDateRange(e.startTime, e.endTime)} · {e.status === "confirmed" ? "已确认" : e.status}
                    </p>
                  </div>
                ))}
              </div>
            );
          }

          // 待办列表
          if (Array.isArray(output.todos) && output.todos.length > 0) {
            return (
              <div key={i} className="space-y-1.5">
                <p className="text-[11px] font-medium text-body-mid">{output.message as string}：</p>
                {(output.todos as Array<Record<string, string>>).map((t, j) => (
                  <div key={j} className="rounded-lg bg-canvas px-3 py-2 border border-mute/50 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-ink">{t.title}</p>
                      {t.dueDate && <p className="text-[10px] text-body-mid">截止：{t.dueDate}</p>}
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      t.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>{t.status === "completed" ? "已完成" : "待处理"}</span>
                  </div>
                ))}
              </div>
            );
          }

          // 报销列表
          if (Array.isArray(output.expenses) && output.expenses.length > 0) {
            return (
              <div key={i} className="space-y-1.5">
                <p className="text-[11px] font-medium text-body-mid">{output.message as string}：</p>
                {(output.expenses as Array<Record<string, string>>).map((e, j) => (
                  <div key={j} className="rounded-lg bg-canvas px-3 py-2 border border-mute/50">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-ink">{expenseTypeLabel(e.expenseType)} {e.amount}元</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        e.status === "pending" ? "bg-amber-100 text-amber-700" : e.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                      }`}>{e.status === "pending" ? "审批中" : e.status === "confirmed" ? "已确认" : "草稿"}</span>
                    </div>
                    {e.description && <p className="text-[10px] text-body-mid mt-0.5">{e.description}</p>}
                  </div>
                ))}
              </div>
            );
          }

          return null;
        })}
      </div>
    );
  } catch {
    return null;
  }
}

function formatDateRange(start: string, end: string): string {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
    return `${fmt(s)} - ${fmt(e)}`;
  } catch { return ""; }
}

function expenseTypeLabel(type: string): string {
  const map: Record<string, string> = { transport: "交通", hotel: "住宿", meal: "餐费", office: "办公", travel: "差旅" };
  return map[type] || type || "其他";
}
