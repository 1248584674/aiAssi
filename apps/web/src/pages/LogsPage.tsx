// ── Agent 执行日志页面 — Zapier 风格 ──
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToolCalls, type ToolCall } from "../api/client.js";

export default function LogsPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      getToolCalls(sessionId)
        .then(({ toolCalls }) => setToolCalls(toolCalls))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* 头部 */}
      <header className="flex items-center justify-between border-b border-mute px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs text-body-mid transition hover:text-ink"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7 2L3 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            返回
          </button>
          <div>
            <h1 className="text-xs font-semibold text-ink">Agent 执行日志</h1>
            <p className="text-[10px] font-mono text-body-mid">{sessionId}</p>
          </div>
        </div>
      </header>

      {/* 时间线 */}
      <div className="mx-auto max-w-2xl px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="h-5 w-5 animate-spin text-mute" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="30 10" />
            </svg>
          </div>
        ) : toolCalls.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-body-mid">暂无工具调用记录</p>
            <p className="mt-1 text-xs text-mute">
              完成一次对话后，工具调用日志将在此展示
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* 时间线竖线 */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-mute" />

            <div className="space-y-6">
              {toolCalls.map((tc, i) => (
                <div key={tc.id} className="relative flex gap-4">
                  {/* 节点 */}
                  <div
                    className={`relative z-10 mt-1 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${
                      tc.status === "success"
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-red-500/50 bg-red-500/10 text-red-500"
                    }`}
                  >
                    {tc.status === "success" ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M3 3l4 4M7 3l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>

                  {/* 内容卡片 */}
                  <div className="flex-1 rounded-xl border border-mute bg-canvas-soft p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">
                        {tc.toolName}
                      </span>
                      <span className="text-[10px] text-body-mid">
                        Step {tc.stepId || "?"} · {new Date(tc.createdAt).toLocaleTimeString("zh-CN")}
                      </span>
                    </div>

                    {tc.errorMessage && (
                      <div className="mb-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-600">
                        {tc.errorMessage}
                      </div>
                    )}

                    {/* 输入 / 输出 JSON（可折叠） */}
                    <details className="group">
                      <summary className="cursor-pointer text-[11px] text-body-mid transition hover:text-body">
                        输入 / 输出 JSON
                      </summary>
                      <div className="mt-2 space-y-2">
                        <div>
                          <span className="text-[10px] font-medium text-body-mid">输入</span>
                          <pre className="mt-1 rounded-md bg-canvas px-3 py-2 text-[11px] leading-relaxed text-body overflow-x-auto border border-mute/50">
                            {formatJson(tc.inputJson)}
                          </pre>
                        </div>
                        {tc.outputJson && (
                          <div>
                            <span className="text-[10px] font-medium text-body-mid">输出</span>
                            <pre className="mt-1 rounded-md bg-canvas px-3 py-2 text-[11px] leading-relaxed text-body overflow-x-auto border border-mute/50">
                              {formatJson(tc.outputJson)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
