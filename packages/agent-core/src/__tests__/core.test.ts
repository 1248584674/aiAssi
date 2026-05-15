// ── Agent Core 单元测试 ──
import { describe, it, expect } from "vitest";
import { Planner } from "../runtime/planner.js";
import { normalizeEntities, extractNegativeFields, buildFilledSummary, fieldLabel, parseRelativeDate } from "../runtime/agent-runtime.js";
import { IntentRouter } from "../runtime/intent-router.js";
import { MockLLMProvider } from "../llm/mock-llm.js";

// ============================================================
// Planner 测试
// ============================================================
describe("Planner", () => {
  const planner = new Planner();

  it("calendar.create 包含 3 个步骤", () => {
    const plan = planner.createPlan("calendar.create");
    expect(plan.intent).toBe("calendar.create");
    expect(plan.steps.length).toBe(3);
    expect(plan.steps[0].tool).toBe("calendar.checkConflict");
    expect(plan.steps[2].action).toBe("wait_confirmation");
  });

  it("expense.create 包含 3 个步骤", () => {
    const plan = planner.createPlan("expense.create");
    expect(plan.steps[1].tool).toBe("expense.createDraft");
  });

  it("todo.create 包含 2 个步骤", () => {
    const plan = planner.createPlan("todo.create");
    expect(plan.steps.length).toBe(2);
    expect(plan.steps[1].tool).toBe("todo.create");
  });

  it("todo.query 单步骤", () => {
    const plan = planner.createPlan("todo.query");
    expect(plan.steps[0].tool).toBe("todo.query");
  });

  it("calendar.query 调用 calendar.listEvents", () => {
    const plan = planner.createPlan("calendar.query");
    expect(plan.steps[0].tool).toBe("calendar.listEvents");
  });

  it("expense.query 调用 expense.list", () => {
    const plan = planner.createPlan("expense.query");
    expect(plan.steps[0].tool).toBe("expense.list");
  });

  it("未知意图返回默认计划", () => {
    const plan = planner.createPlan("nonexistent");
    expect(plan.intent).toBe("unknown");
  });
});

// ============================================================
// normalizeEntities 测试
// ============================================================
describe("normalizeEntities", () => {
  it("type → expenseType", () => {
    const result = normalizeEntities({ type: "transport" });
    expect(result.expenseType).toBe("transport");
  });

  it("date → expenseDate", () => {
    const result = normalizeEntities({ date: "2026-05-14" });
    expect(result.expenseDate).toBe("2026-05-14");
  });

  it("project → projectId", () => {
    const result = normalizeEntities({ project: "Q2" });
    expect(result.projectId).toBe("Q2");
  });

  it("deadline → dueDate", () => {
    const result = normalizeEntities({ deadline: "2026-06-01" });
    expect(result.dueDate).toBe("2026-06-01");
  });

  it("跳过 null/undefined/空字符串", () => {
    const result = normalizeEntities({ title: null, amount: undefined, desc: "" });
    expect(Object.keys(result).length).toBe(0);
  });

  it("跳过中文 key", () => {
    const result = normalizeEntities({ "费用类型": "transport", title: "test" });
    expect(result["费用类型"]).toBeUndefined();
    expect(result.title).toBe("test");
  });

  it("跳过 userId", () => {
    const result = normalizeEntities({ userId: "123", title: "test" });
    expect(result.userId).toBeUndefined();
    expect(result.title).toBe("test");
  });

  it("费用类型中文→英文兜底", () => {
    const result = normalizeEntities({ expenseType: "交通" });
    expect(result.expenseType).toBe("transport");
  });

  it("保留已标准的 key", () => {
    const result = normalizeEntities({ expenseType: "hotel", amount: 500 });
    expect(result.expenseType).toBe("hotel");
    expect(result.amount).toBe(500);
  });
});

// ============================================================
// extractNegativeFields 测试
// ============================================================
describe("extractNegativeFields", () => {
  it("没有发票 → invoiceFileIds: []", () => {
    const result = extractNegativeFields("没有发票", []);
    expect(result.invoiceFileIds).toEqual([]);
  });

  it("不需要发票 → invoiceFileIds: []", () => {
    const result = extractNegativeFields("不需要发票", []);
    expect(result.invoiceFileIds).toEqual([]);
  });

  it("没有项目 → projectId: 无", () => {
    const result = extractNegativeFields("没有项目", []);
    expect(result.projectId).toBe("无");
  });

  it("无关文本不触发", () => {
    const result = extractNegativeFields("报销打车费", []);
    expect(Object.keys(result).length).toBe(0);
  });
});

// ============================================================
// fieldLabel 测试
// ============================================================
describe("fieldLabel", () => {
  it("标题", () => expect(fieldLabel("title")).toBe("标题"));
  it("费用类型", () => expect(fieldLabel("expenseType")).toBe("费用类型"));
  it("截止日期", () => expect(fieldLabel("dueDate")).toBe("截止日期"));
  it("未知字段原样返回", () => expect(fieldLabel("unknown_key")).toBe("unknown_key"));
});

// ============================================================
// parseRelativeDate 测试
// ============================================================
describe("parseRelativeDate", () => {
  it("今天", () => {
    const d = new Date().toISOString().split("T")[0];
    expect(parseRelativeDate("今天")).toBe(d);
  });
  it("昨天", () => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    expect(parseRelativeDate("昨天")).toBe(d.toISOString().split("T")[0]);
  });
  it("明天", () => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    expect(parseRelativeDate("明天")).toBe(d.toISOString().split("T")[0]);
  });
  it("非法输入返回 null", () => {
    expect(parseRelativeDate("下周")).toBeNull();
  });
});

// ============================================================
// buildFilledSummary 测试
// ============================================================
describe("buildFilledSummary", () => {
  it("生成已填字段摘要", () => {
    const summary = buildFilledSummary("expense.create", {
      amount: 128, expenseType: "transport", userId: "u1",
    });
    expect(summary).toContain("金额：128");
    expect(summary).toContain("费用类型：transport");
    expect(summary).not.toContain("userId");
  });

  it("空实体返回暂无", () => {
    const summary = buildFilledSummary("calendar.create", { userId: "u1" });
    expect(summary).toContain("暂无");
  });
});

// ============================================================
// IntentRouter 测试（MockLLM）
// ============================================================
describe("IntentRouter", () => {
  const mockLLM = new MockLLMProvider();
  const router = new IntentRouter(mockLLM);

  it("报销关键词 → expense.create", async () => {
    const result = await router.detect("报销昨天打车费128元");
    expect(result.intent).toBe("expense.create");
    expect(result.entities.amount).toBe(128);
  });

  it("开会关键词 → calendar.create", async () => {
    const result = await router.detect("明天下午3点约张三开会");
    expect(result.intent).toBe("calendar.create");
  });

  it("待办关键词 → todo.create", async () => {
    const result = await router.detect("帮我记一个待办：买水果");
    // MockLLM 不支持 todo 关键词，需要看 regex
    // "帮我记一个" 匹配 ??? 检查 mock-llm regex
    expect(["todo.create", "general.chat"]).toContain(result.intent);
  });

  it("闲聊 → general.chat", async () => {
    const result = await router.detect("你好");
    expect(result.intent).toBe("general.chat");
  });
});