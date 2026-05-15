// ── 日程管理工具集 ──
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import type { AgentTool } from "./tool.interface.js";

// ── 输入/输出类型 ──
const createDraftInput = z.object({
  userId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  participants: z.array(z.string()).optional(),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().optional(),
});

type CreateDraftInput = z.infer<typeof createDraftInput>;

interface CreateDraftOutput {
  eventId: string;
  status: string;
  message: string;
}

// ── 创建日程草稿 Tool ──
export class CalendarCreateDraftTool implements AgentTool<CreateDraftInput, CreateDraftOutput> {
  name = "calendar.createDraft";
  description = "创建日程草稿，不直接确认";
  inputSchema = createDraftInput;
  requiresConfirmation = false;
  riskLevel = "low";

  constructor(private prisma: PrismaClient) {}

  async execute(input: CreateDraftInput): Promise<CreateDraftOutput> {
    const event = await this.prisma.calendarEvent.create({
      data: {
        userId: input.userId,
        title: input.title,
        description: input.description,
        participants: input.participants ? JSON.stringify(input.participants) : null,
        startTime: new Date(input.startTime),
        endTime: new Date(input.endTime),
        location: input.location,
        status: "draft",
      },
    });

    return {
      eventId: event.id,
      status: "draft",
      message: `日程草稿已创建：${input.title}`,
    };
  }
}

// ── 确认日程 Tool ──
const confirmEventInput = z.object({
  eventId: z.string(),
});

type ConfirmEventInput = z.infer<typeof confirmEventInput>;

interface ConfirmEventOutput {
  eventId: string;
  status: string;
  message: string;
}

export class CalendarConfirmEventTool implements AgentTool<ConfirmEventInput, ConfirmEventOutput> {
  name = "calendar.confirmEvent";
  description = "确认并保存日程";
  inputSchema = confirmEventInput;
  requiresConfirmation = true;
  riskLevel = "medium";

  constructor(private prisma: PrismaClient) {}

  async execute(input: ConfirmEventInput): Promise<ConfirmEventOutput> {
    const event = await this.prisma.calendarEvent.update({
      where: { id: input.eventId },
      data: { status: "confirmed" },
    });

    return {
      eventId: event.id,
      status: "confirmed",
      message: `日程已确认：${event.title}`,
    };
  }
}

// ── 检查时间冲突 Tool ──
const checkConflictInput = z.object({
  userId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
});

type CheckConflictInput = z.infer<typeof checkConflictInput>;

interface ConflictInfo {
  title: string;
  startTime: string;
  endTime: string;
}

interface CheckConflictOutput {
  hasConflict: boolean;
  conflicts: ConflictInfo[];
}

export class CalendarCheckConflictTool implements AgentTool<CheckConflictInput, CheckConflictOutput> {
  name = "calendar.checkConflict";
  description = "检查日程时间冲突";
  inputSchema = checkConflictInput;
  requiresConfirmation = false;
  riskLevel = "low";

  constructor(private prisma: PrismaClient) {}

  async execute(input: CheckConflictInput): Promise<CheckConflictOutput> {
    const conflicts = await this.prisma.calendarEvent.findMany({
      where: {
        userId: input.userId,
        status: { not: "cancelled" },
        OR: [
          {
            startTime: { lte: new Date(input.endTime) },
            endTime: { gte: new Date(input.startTime) },
          },
        ],
      },
    });

    return {
      hasConflict: conflicts.length > 0,
      conflicts: conflicts.map((e) => ({
        title: e.title,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime.toISOString(),
      })),
    };
  }
}

// ── 查询日程列表 Tool ──
const listEventsInput = z.object({
  userId: z.string(),
});

type ListEventsInput = z.infer<typeof listEventsInput>;

interface CalendarEventItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  participants: string | null;
}

interface ListEventsOutput {
  events: CalendarEventItem[];
  total: number;
  message: string;
}

export class CalendarListTool implements AgentTool<ListEventsInput, ListEventsOutput> {
  name = "calendar.listEvents";
  description = "查询用户日程列表";
  inputSchema = listEventsInput;
  requiresConfirmation = false;
  riskLevel = "low";

  constructor(private prisma: PrismaClient) {}

  async execute(input: ListEventsInput): Promise<ListEventsOutput> {
    const events = await this.prisma.calendarEvent.findMany({
      where: { userId: input.userId },
      orderBy: { startTime: "asc" },
    });

    return {
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime.toISOString(),
        status: e.status,
        participants: e.participants,
      })),
      total: events.length,
      message: events.length > 0
        ? `找到 ${events.length} 条日程`
        : "暂无日程",
    };
  }
}
