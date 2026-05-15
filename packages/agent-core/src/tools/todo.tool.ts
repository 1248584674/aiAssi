// ── 任务待办工具集 ──
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import type { AgentTool } from "./tool.interface.js";

// ── 创建待办 ──
const createTodoInput = z.object({
  userId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  priority: z.string().optional(),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  assignee: z.string().optional(),
});

type CreateTodoInput = z.infer<typeof createTodoInput>;

interface CreateTodoOutput {
  todoId: string;
  status: string;
  message: string;
}

export class TodoCreateTool implements AgentTool<CreateTodoInput, CreateTodoOutput> {
  name = "todo.create";
  description = "创建任务待办";
  inputSchema = createTodoInput;
  requiresConfirmation = false;
  riskLevel = "low";

  constructor(private prisma: PrismaClient) {}

  async execute(input: CreateTodoInput): Promise<CreateTodoOutput> {
    const todo = await this.prisma.todo.create({
      data: {
        userId: input.userId,
        title: input.title,
        description: input.description,
        priority: input.priority || "medium",
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        tags: input.tags ? JSON.stringify(input.tags) : null,
        assignee: input.assignee,
        status: "pending",
      },
    });

    return {
      todoId: todo.id,
      status: "pending",
      message: `待办已创建：${input.title}`,
    };
  }
}

// ── 完成待办 ──
const completeTodoInput = z.object({
  todoId: z.string(),
});

type CompleteTodoInput = z.infer<typeof completeTodoInput>;

interface CompleteTodoOutput {
  todoId: string;
  status: string;
  message: string;
}

export class TodoCompleteTool implements AgentTool<CompleteTodoInput, CompleteTodoOutput> {
  name = "todo.complete";
  description = "标记待办为已完成";
  inputSchema = completeTodoInput;
  requiresConfirmation = true;
  riskLevel = "medium";

  constructor(private prisma: PrismaClient) {}

  async execute(input: CompleteTodoInput): Promise<CompleteTodoOutput> {
    const todo = await this.prisma.todo.update({
      where: { id: input.todoId },
      data: { status: "completed" },
    });

    return {
      todoId: todo.id,
      status: "completed",
      message: `待办已完成：${todo.title}`,
    };
  }
}

// ── 查询待办 ──
const queryTodoInput = z.object({
  userId: z.string(),
  status: z.string().optional(),
  priority: z.string().optional(),
});

type QueryTodoInput = z.infer<typeof queryTodoInput>;

interface TodoItem {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  tags: string | null;
  assignee: string | null;
  status: string;
  createdAt: string;
}

interface QueryTodoOutput {
  todos: TodoItem[];
  total: number;
  message: string;
}

export class TodoQueryTool implements AgentTool<QueryTodoInput, QueryTodoOutput> {
  name = "todo.query";
  description = "查询用户待办列表";
  inputSchema = queryTodoInput;
  requiresConfirmation = false;
  riskLevel = "low";

  constructor(private prisma: PrismaClient) {}

  async execute(input: QueryTodoInput): Promise<QueryTodoOutput> {
    const where: Record<string, unknown> = { userId: input.userId };
    if (input.status) where.status = input.status;
    if (input.priority) where.priority = input.priority;

    const todos = await this.prisma.todo.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return {
      todos: todos.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        dueDate: t.dueDate?.toISOString() || null,
        tags: t.tags,
        assignee: t.assignee,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
      total: todos.length,
      message: todos.length > 0
        ? `找到 ${todos.length} 条待办`
        : "暂无待办事项",
    };
  }
}
