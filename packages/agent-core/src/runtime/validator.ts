// ── 校验器：检查必填字段和业务规则 ──
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { CALENDAR_REQUIRED_FIELDS, EXPENSE_REQUIRED_FIELDS, TODO_REQUIRED_FIELDS } from "@ai-assistant/shared";

export interface ValidationResult {
  valid: boolean;
  missingFields: string[];
  conflicts?: { title: string; startTime: string; endTime: string }[];
  riskLevel: "low" | "medium" | "high";
  requiresConfirmation: boolean;
  message: string;
}

export class Validator {
  constructor(private prisma: PrismaClient) {}

  /** 根据意图和提取的实体做校验 */
  async validate(
    intent: string,
    entities: Record<string, unknown>
  ): Promise<ValidationResult> {
    const missingFields: string[] = [];

    switch (intent) {
      case "calendar.create": {
        // 检查必填字段
        for (const field of CALENDAR_REQUIRED_FIELDS) {
          if (!entities[field]) {
            missingFields.push(field);
          }
        }

        // 如果有时间信息，检查冲突
        if (entities.startTime && entities.endTime && entities.userId) {
          const conflicts = await this.prisma.calendarEvent.findMany({
            where: {
              userId: entities.userId as string,
              status: { not: "cancelled" },
              startTime: { lt: new Date(entities.endTime as string) },
              endTime: { gt: new Date(entities.startTime as string) },
            },
          });

          if (conflicts.length > 0) {
            return {
              valid: false,
              missingFields,
              conflicts: conflicts.map((e) => ({
                title: e.title,
                startTime: e.startTime.toISOString(),
                endTime: e.endTime.toISOString(),
              })),
              riskLevel: "low",
              requiresConfirmation: true,
              message: `该时间段已有 ${conflicts.length} 个日程，是否仍然创建？`,
            };
          }
        }

        const valid = missingFields.length === 0;
        return {
          valid,
          missingFields,
          riskLevel: "low",
          requiresConfirmation: true,
          message: valid ? "信息完整，可以创建日程" : `缺少以下字段：${missingFields.join("、")}`,
        };
      }

      case "expense.create": {
        for (const field of EXPENSE_REQUIRED_FIELDS) {
          if (!entities[field]) {
            missingFields.push(field);
          }
        }

        // 额外检查项目归属，发票设为非必填
        if (!entities.projectId) missingFields.push("projectId");
        // invoiceFileIds 为可选项，用户无发票也可创建报销

        // 校验金额
        if (entities.amount && (entities.amount as number) <= 0) {
          return {
            valid: false,
            missingFields: [...missingFields, "amount"],
            riskLevel: "low",
            requiresConfirmation: false,
            message: "金额必须大于 0",
          };
        }

        const valid = missingFields.length === 0;
        return {
          valid,
          missingFields,
          riskLevel: valid ? "medium" : "low",
          requiresConfirmation: valid,
          message: valid ? "信息完整，可以创建报销" : `缺少以下字段：${missingFields.join("、")}`,
        };
      }

      // 查询类意图：无需校验，直接通过
      case "calendar.query":
      case "expense.query":
      case "todo.query":
        return {
          valid: true,
          missingFields: [],
          riskLevel: "low",
          requiresConfirmation: false,
          message: "",
        };

      case "todo.create": {
        for (const field of TODO_REQUIRED_FIELDS) {
          if (!entities[field]) {
            missingFields.push(field);
          }
        }

        const valid = missingFields.length === 0;
        return {
          valid,
          missingFields,
          riskLevel: "low",
          requiresConfirmation: false,
          message: valid ? "信息完整，可以创建待办" : `缺少以下字段：${missingFields.join("、")}`,
        };
      }

      default:
        return {
          valid: true,
          missingFields: [],
          riskLevel: "low",
          requiresConfirmation: false,
          message: "",
        };
    }
  }
}
