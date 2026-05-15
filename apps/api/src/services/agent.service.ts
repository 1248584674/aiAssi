// ── Agent 服务：组装 AgentRuntime 并暴露给路由 ──
import { PrismaClient } from "@prisma/client";
import {
  AgentRuntime,
  ToolRegistry,
  createLLMProvider,
  CalendarCreateDraftTool,
  CalendarConfirmEventTool,
  CalendarCheckConflictTool,
  CalendarListTool,
  ExpenseCreateDraftTool,
  ExpenseConfirmSubmitTool,
  ExpenseCheckFieldsTool,
  ExpenseListTool,
  TodoCreateTool,
  TodoCompleteTool,
  TodoQueryTool,
} from "@ai-assistant/agent-core";
import { config } from "../config.js";
import { prisma } from "../db.js";

/** 单例 AgentRuntime */
let agentRuntime: AgentRuntime | null = null;

/** 获取 AgentRuntime（懒初始化） */
export function getAgentRuntime(): AgentRuntime {
  if (agentRuntime) return agentRuntime;

  // 创建 LLM Provider
  const llm = createLLMProvider({
    provider: config.llm.provider as "claude" | "openai" | "mock",
    model: config.llm.model,
    claudeApiKey: config.llm.claudeApiKey,
    openaiApiKey: config.llm.openaiApiKey,
    openaiBaseUrl: config.llm.openaiBaseUrl,
  });

  // 注册所有工具
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(new CalendarCreateDraftTool(prisma));
  toolRegistry.register(new CalendarConfirmEventTool(prisma));
  toolRegistry.register(new CalendarCheckConflictTool(prisma));
  toolRegistry.register(new CalendarListTool(prisma));
  toolRegistry.register(new ExpenseCreateDraftTool(prisma));
  toolRegistry.register(new ExpenseConfirmSubmitTool(prisma));
  toolRegistry.register(new ExpenseCheckFieldsTool(prisma));
  toolRegistry.register(new ExpenseListTool(prisma));
  toolRegistry.register(new TodoCreateTool(prisma));
  toolRegistry.register(new TodoCompleteTool(prisma));
  toolRegistry.register(new TodoQueryTool(prisma));

  console.log(`🤖 Agent Runtime 已初始化（LLM: ${config.llm.provider}）`);

  agentRuntime = new AgentRuntime(llm, toolRegistry, prisma);
  return agentRuntime;
}
