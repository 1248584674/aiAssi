// ── 意图识别 Zod Schema ──
import { z } from "zod";

export const intentSchema = z.object({
  intent: z.enum([
    "calendar.create",
    "calendar.update",
    "calendar.query",
    "calendar.delete",
    "expense.create",
    "expense.query",
    "expense.update",
    "expense.submit",
    "todo.create",
    "todo.query",
    "todo.update",
    "todo.complete",
    "general.chat",
    "unknown",
  ]),
  confidence: z.number().min(0).max(1),
  entities: z.record(z.unknown()),
});

export type IntentOutput = z.infer<typeof intentSchema>;
