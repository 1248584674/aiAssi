// ── 任务规划器（规则驱动） ──
import type { Plan, PlanStep } from "@ai-assistant/shared";

/** 各意图的计划模板 */
const PLAN_TEMPLATES: Record<string, Plan> = {
  "calendar.create": {
    goal: "创建日程",
    intent: "calendar.create",
    steps: [
      { stepId: "step_1", action: "check_time_conflict", tool: "calendar.checkConflict", description: "检查时间冲突" },
      { stepId: "step_2", action: "create_draft", tool: "calendar.createDraft", description: "创建日程草稿" },
      { stepId: "step_3", action: "wait_confirmation", tool: null, description: "等待用户确认" },
    ],
  },
  "expense.create": {
    goal: "创建报销草稿",
    intent: "expense.create",
    steps: [
      { stepId: "step_1", action: "check_required_fields", tool: "expense.checkFields", description: "检查必填字段" },
      { stepId: "step_2", action: "create_draft", tool: "expense.createDraft", description: "创建报销草稿" },
      { stepId: "step_3", action: "wait_confirmation", tool: null, description: "等待用户确认" },
    ],
  },
  "expense.submit": {
    goal: "提交报销",
    intent: "expense.submit",
    steps: [
      { stepId: "step_1", action: "confirm_submit", tool: "expense.confirmSubmit", description: "确认提交报销" },
    ],
  },
  "calendar.query": {
    goal: "查询日程",
    intent: "calendar.query",
    steps: [
      { stepId: "step_1", action: "list_events", tool: "calendar.listEvents", description: "查询用户日程" },
    ],
  },
  "expense.query": {
    goal: "查询报销",
    intent: "expense.query",
    steps: [
      { stepId: "step_1", action: "list_expenses", tool: "expense.list", description: "查询用户报销" },
    ],
  },
  "todo.create": {
    goal: "创建待办",
    intent: "todo.create",
    steps: [
      { stepId: "step_1", action: "extract_info", tool: null, description: "提取待办信息" },
      { stepId: "step_2", action: "create_todo", tool: "todo.create", description: "创建待办" },
    ],
  },
  "todo.query": {
    goal: "查询待办",
    intent: "todo.query",
    steps: [
      { stepId: "step_1", action: "query_todos", tool: "todo.query", description: "查询用户待办" },
    ],
  },
  "todo.complete": {
    goal: "完成待办",
    intent: "todo.complete",
    steps: [
      { stepId: "step_1", action: "complete_todo", tool: "todo.complete", description: "标记待办为已完成" },
    ],
  },
};

export class Planner {
  /** 根据意图生成执行计划 */
  createPlan(intent: string): Plan {
    const template = PLAN_TEMPLATES[intent];
    if (template) {
      // 深拷贝模板
      return JSON.parse(JSON.stringify(template));
    }

    // 未知意图：返回默认计划
    return {
      goal: "无法识别意图",
      intent: "unknown",
      steps: [
        { stepId: "step_1", action: "reply_unknown", tool: null, description: "提示用户重新描述需求" },
      ],
    };
  }
}
