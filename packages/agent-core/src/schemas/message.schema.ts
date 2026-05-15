// ── 消息 Schema ──
import { z } from "zod";

export const messageTypeSchema = z.enum([
  "text",
  "intent_result",
  "missing_fields",
  "confirmation",
  "tool_result",
  "error",
]);

export const messageRoleSchema = z.enum(["user", "assistant", "system"]);
