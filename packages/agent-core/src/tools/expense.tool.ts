// ── 费用报销工具集 ──
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import type { AgentTool } from "./tool.interface.js";

// ── 输入/输出类型 ──
const createDraftInput = z.object({
  userId: z.string(),
  expenseType: z.string(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  expenseDate: z.string().optional(),
  city: z.string().optional(),
  projectId: z.string().optional(),
  description: z.string().optional(),
  invoiceFileIds: z.array(z.string()).optional(),
});

type CreateDraftInput = z.infer<typeof createDraftInput>;

interface CreateDraftOutput {
  expenseId: string;
  status: string;
  missingFields: string[];
  message: string;
}

// ── 创建报销草稿 Tool ──
export class ExpenseCreateDraftTool implements AgentTool<CreateDraftInput, CreateDraftOutput> {
  name = "expense.createDraft";
  description = "创建报销草稿";
  inputSchema = createDraftInput;
  requiresConfirmation = false;
  riskLevel = "low";

  constructor(private prisma: PrismaClient) {}

  async execute(input: CreateDraftInput): Promise<CreateDraftOutput> {
    const missingFields: string[] = [];

    if (!input.amount) missingFields.push("amount");
    if (!input.expenseDate) missingFields.push("expenseDate");
    if (!input.projectId) missingFields.push("projectId");
    if (!input.invoiceFileIds || input.invoiceFileIds.length === 0) {
      missingFields.push("invoiceFileIds");
    }

    const expense = await this.prisma.expense.create({
      data: {
        userId: input.userId,
        expenseType: input.expenseType,
        amount: input.amount,
        currency: input.currency || "CNY",
        expenseDate: input.expenseDate ? new Date(input.expenseDate) : null,
        city: input.city,
        projectId: input.projectId,
        description: input.description,
        invoiceFileIds: input.invoiceFileIds ? JSON.stringify(input.invoiceFileIds) : null,
        status: "draft",
      },
    });

    return {
      expenseId: expense.id,
      status: "draft",
      missingFields,
      message: missingFields.length > 0
        ? `报销草稿已创建（缺少 ${missingFields.length} 个字段）`
        : "报销草稿已创建，信息完整",
    };
  }
}

// ── 提交报销确认 Tool ──
const confirmSubmitInput = z.object({
  expenseId: z.string(),
});

type ConfirmSubmitInput = z.infer<typeof confirmSubmitInput>;

interface ConfirmSubmitOutput {
  expenseId: string;
  status: string;
  message: string;
}

export class ExpenseConfirmSubmitTool implements AgentTool<ConfirmSubmitInput, ConfirmSubmitOutput> {
  name = "expense.confirmSubmit";
  description = "确认并提交报销申请";
  inputSchema = confirmSubmitInput;
  requiresConfirmation = true;
  riskLevel = "high";

  constructor(private prisma: PrismaClient) {}

  async execute(input: ConfirmSubmitInput): Promise<ConfirmSubmitOutput> {
    const expense = await this.prisma.expense.update({
      where: { id: input.expenseId },
      data: { status: "pending" },
    });

    return {
      expenseId: expense.id,
      status: "pending",
      message: "报销申请已提交，等待审批",
    };
  }
}

// ── 检查必填字段 Tool ──
const checkFieldsInput = z.object({
  expenseType: z.string(),
  amount: z.number().optional(),
  expenseDate: z.string().optional(),
  projectId: z.string().optional(),
  invoiceFileIds: z.array(z.string()).optional(),
});

type CheckFieldsInput = z.infer<typeof checkFieldsInput>;

interface CheckFieldsOutput {
  valid: boolean;
  missingFields: string[];
}

export class ExpenseCheckFieldsTool implements AgentTool<CheckFieldsInput, CheckFieldsOutput> {
  name = "expense.checkFields";
  description = "检查报销必填字段是否完整";
  inputSchema = checkFieldsInput;
  requiresConfirmation = false;
  riskLevel = "low";

  constructor(private _prisma: PrismaClient) {}

  async execute(input: CheckFieldsInput): Promise<CheckFieldsOutput> {
    const missingFields: string[] = [];

    if (!input.amount) missingFields.push("amount");
    if (!input.expenseDate) missingFields.push("expenseDate");
    if (!input.projectId) missingFields.push("projectId");
    if (!input.invoiceFileIds || input.invoiceFileIds.length === 0) {
      missingFields.push("invoiceFileIds");
    }

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }
}

// ── 查询报销列表 Tool ──
const listExpensesInput = z.object({
  userId: z.string(),
});

type ListExpensesInput = z.infer<typeof listExpensesInput>;

interface ExpenseItem {
  id: string;
  expenseType: string;
  amount: number | null;
  expenseDate: string | null;
  description: string | null;
  status: string;
}

interface ListExpensesOutput {
  expenses: ExpenseItem[];
  total: number;
  message: string;
}

export class ExpenseListTool implements AgentTool<ListExpensesInput, ListExpensesOutput> {
  name = "expense.list";
  description = "查询用户报销列表";
  inputSchema = listExpensesInput;
  requiresConfirmation = false;
  riskLevel = "low";

  constructor(private prisma: PrismaClient) {}

  async execute(input: ListExpensesInput): Promise<ListExpensesOutput> {
    const expenses = await this.prisma.expense.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
    });

    return {
      expenses: expenses.map((e) => ({
        id: e.id,
        expenseType: e.expenseType,
        amount: e.amount,
        expenseDate: e.expenseDate?.toISOString() || null,
        description: e.description,
        status: e.status,
      })),
      total: expenses.length,
      message: expenses.length > 0
        ? `找到 ${expenses.length} 条报销`
        : "暂无报销记录",
    };
  }
}
