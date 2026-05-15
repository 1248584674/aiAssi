// ── Planner 输出 Schema ──
import { z } from "zod";

export const planStepSchema = z.object({
  stepId: z.string(),
  action: z.string(),
  tool: z.string().nullable(),
  description: z.string(),
});

export const planSchema = z.object({
  goal: z.string(),
  intent: z.string(),
  steps: z.array(planStepSchema),
});

export type PlanOutput = z.infer<typeof planSchema>;
