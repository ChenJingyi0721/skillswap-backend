import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { requireAuth } from "./auth";

/**
 * POST /api/ai/process — AI 通用处理
 * 支持 action: translate | contract | schedule
 */
export const processAI = action({
  args: {
    action: v.union(
      v.literal("translate"),
      v.literal("contract"),
      v.literal("schedule")
    ),
    context: v.string(),
    targetLanguage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const systemPrompts: Record<string, string> = {
      translate: `你是一个专业翻译助手。请将以下内容翻译为 ${args.targetLanguage ?? "英语"}。只返回翻译结果，不要附加解释。`,
      contract: `你是一个技能交换合同草拟助手。根据以下对话上下文，生成一份简洁的技能交换协议，包含：双方信息、交换技能、时间安排、取消政策。使用 Markdown 格式输出。`,
      schedule: `你是一个日程安排助手。根据以下对话上下文，建议最佳的交换会话时间安排。考虑双方的时区和可用性，提供 3 个候选时间段。`,
    };

    const systemPrompt = systemPrompts[args.action];

    try {
      const response = await fetch(
        process.env.OPENAI_BASE_URL
          ? `${process.env.OPENAI_BASE_URL}/chat/completions`
          : "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: process.env.AI_MODEL ?? "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: args.context },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        }
      );

      const data = await response.json();
      const result =
        data.choices?.[0]?.message?.content ?? "AI 处理暂时不可用";

      return {
        result,
        confidence: 0.85,
      };
    } catch (error) {
      return {
        result: getFallbackResult(args.action, args.context),
        confidence: 0.5,
      };
    }
  },
});

/**
 * POST /api/ai/match/chat — AI 配对助手聊天
 * 接收对话历史，返回匹配建议 + 可选 skillIds
 */
export const matchChat = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const systemPrompt = `你是 SkillSwap 平台的 AI 配对助手。你的职责是：
1. 了解用户想要学习或教授的技能
2. 询问用户的技能水平、偏好和时间安排
3. 根据对话内容推荐最佳匹配的技能交换伙伴
4. 提供具体的匹配理由和建议

请用友好、专业的语气回复。如果你已经收集了足够信息来推荐匹配，在回复末尾添加 JSON 格式的匹配建议：
{"matchSuggestion": {"skillTag": "技能名", "level": "beginner|intermediate|advanced", "ready": true}}

如果信息还不够，继续提问。`;

    try {
      const response = await fetch(
        process.env.OPENAI_BASE_URL
          ? `${process.env.OPENAI_BASE_URL}/chat/completions`
          : "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: process.env.AI_MODEL ?? "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              ...args.messages,
            ],
            temperature: 0.8,
            max_tokens: 800,
          }),
        }
      );

      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content ?? "暂时无法处理，请稍后再试";

      let matchSuggestion = null;
      const jsonMatch = content.match(
        /\{"matchSuggestion":\s*\{[^}]+\}\}/
      );
      if (jsonMatch) {
        try {
          matchSuggestion = JSON.parse(jsonMatch[0]).matchSuggestion;
        } catch {
          // JSON 解析失败时忽略
        }
      }

      const cleanContent = content
        .replace(/\{"matchSuggestion":\s*\{[^}]+\}\}/, "")
        .trim();

      return {
        reply: cleanContent,
        matchSuggestion,
      };
    } catch (error) {
      return {
        reply: "你好！我是 SkillSwap 的 AI 配对助手。请告诉我你想学习什么技能，或者你擅长教授什么技能？我会为你找到最佳的交换伙伴。",
        matchSuggestion: null,
      };
    }
  },
});

/**
 * 保存 AI 对话历史
 */
export const saveConversation = mutation({
  args: {
    type: v.union(v.literal("match"), v.literal("translate"), v.literal("general")),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const existing = await ctx.db
      .query("aiConversations")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("type"), args.type))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { messages: args.messages });
      return existing._id;
    }

    return await ctx.db.insert("aiConversations", {
      userId: user._id,
      type: args.type,
      messages: args.messages,
    });
  },
});

function getFallbackResult(action: string, context: string): string {
  switch (action) {
    case "translate":
      return `[翻译] ${context.slice(0, 100)}...（AI 服务暂不可用，请稍后重试）`;
    case "contract":
      return `## 技能交换协议（草稿）\n\n基于当前对话上下文生成。\n\n> AI 服务暂不可用，以下为模板：\n\n- **双方**：待确认\n- **交换技能**：待确认\n- **时间安排**：待确认\n- **取消政策**：提前 24 小时通知`;
    case "schedule":
      return `建议时间段：\n1. 明天 14:00-15:00\n2. 后天 10:00-11:00\n3. 本周六 16:00-17:00\n\n（AI 服务暂不可用，以上为默认建议）`;
    default:
      return "AI 处理暂时不可用";
  }
}
