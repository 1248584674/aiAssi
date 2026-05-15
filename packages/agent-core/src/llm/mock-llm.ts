// ── Mock LLM Provider（规则匹配，无需 API Key） ──
import type { ZodSchema } from "zod";
import type { ChatMessage, LLMProvider, LLMResult } from "./llm.interface.js";

export class MockLLMProvider implements LLMProvider {
  async chat(messages: ChatMessage[], outputSchema?: ZodSchema): Promise<LLMResult> {
    // 获取最后一条用户消息
    const userMsg = [...messages].reverse().find((m) => m.role === "user");
    const text = userMsg?.content || "";

    // 关键词匹配识别意图
    let intent = "general.chat";
    let confidence = 0.5;
    const entities: Record<string, unknown> = {};

    // 费用报销匹配
    if (/报销|报.*钱|申请.*费|打车|住宿|酒店|餐费|差旅/.test(text)) {
      intent = "expense.create";
      confidence = 0.91;
      // 提取金额
      const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*元/);
      if (amountMatch) entities.amount = parseFloat(amountMatch[1]);
      // 提取日期
      if (/昨天/.test(text)) {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        entities.expenseDate = d.toISOString().split("T")[0];
      } else if (/今天/.test(text)) {
        entities.expenseDate = new Date().toISOString().split("T")[0];
      } else if (/明天/.test(text)) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        entities.expenseDate = d.toISOString().split("T")[0];
      }
      // 提取费用类型
      if (/打车|交通|出行/.test(text)) entities.expenseType = "transport";
      else if (/住宿|酒店/.test(text)) entities.expenseType = "hotel";
      else if (/吃饭|餐|聚餐/.test(text)) entities.expenseType = "meal";
      else if (/办公|文具/.test(text)) entities.expenseType = "office";
      else if (/差旅|出差/.test(text)) entities.expenseType = "travel";
      // 提取说明
      const descMatch = text.match(/报销(.*?)(?:\d+元|的钱|$)/);
      if (descMatch?.[1]) entities.description = descMatch[1].trim();
    }
    // 日程匹配
    else if (/约|开会|会议|日程|安排|创建.*会/.test(text)) {
      intent = "calendar.create";
      confidence = 0.92;
      // 提取参与人
      const personMatch = text.match(/(?:约|和|跟|与)(.{1,4})(?:开会|会议|一起)/);
      if (personMatch?.[1]) entities.participants = [personMatch[1].trim()];
      // 提取标题
      const titleMatch = text.match(/开?个?(.{2,8})(?:会|会议)/);
      if (titleMatch?.[1]) entities.title = titleMatch[1].trim() + "会";
      // 提取时间
      if (/明天/.test(text)) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        entities.date = d.toISOString().split("T")[0];
      } else if (/今天/.test(text)) {
        entities.date = new Date().toISOString().split("T")[0];
      }
      if (/下午/.test(text)) entities.timeOfDay = "afternoon";
      else if (/上午/.test(text)) entities.timeOfDay = "morning";
      // 提取具体时间
      const timeMatch = text.match(/(\d{1,2})点/);
      if (timeMatch) entities.hour = parseInt(timeMatch[1]);
    }

    const result: Record<string, unknown> = {
      intent,
      confidence,
      entities,
    };

    // Schema 校验
    if (outputSchema) {
      const validated = outputSchema.parse(result);
      return { data: validated as Record<string, unknown>, raw: JSON.stringify(result) };
    }

    return { data: result, raw: JSON.stringify(result) };
  }
}
