import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./auth";

/**
 * GET /api/sessions — 获取当前用户的会话列表
 * 支持 filter: upcoming | pending | completed
 * 支持 dashboard: true 时返回 learning/teaching 分组
 */
export const list = query({
  args: {
    filter: v.optional(v.string()),
    dashboard: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const asRequester = await ctx.db
      .query("sessions")
      .withIndex("by_requesterId", (q) => q.eq("requesterId", user._id))
      .collect();

    const asProvider = await ctx.db
      .query("sessions")
      .withIndex("by_providerId", (q) => q.eq("providerId", user._id))
      .collect();

    let allSessions = [
      ...asRequester.map((s) => ({ ...s, type: "learning" as const })),
      ...asProvider.map((s) => ({ ...s, type: "teaching" as const })),
    ];

    if (args.filter) {
      allSessions = allSessions.filter((s) => s.status === args.filter);
    }

    const enriched = await Promise.all(
      allSessions.map(async (s) => {
        const partnerId =
          s.requesterId === user._id ? s.providerId : s.requesterId;
        const partner = await ctx.db.get(partnerId);
        return {
          ...s,
          partner: partner?.name ?? "未知",
          partnerAvatar: partner?.avatar,
        };
      })
    );

    if (args.dashboard) {
      return {
        learning: enriched.filter((s) => s.type === "learning"),
        teaching: enriched.filter((s) => s.type === "teaching"),
      };
    }

    return enriched;
  },
});

/**
 * POST /api/sessions — 发起新交换预约
 */
export const create = mutation({
  args: {
    providerId: v.id("users"),
    skillId: v.optional(v.id("skills")),
    title: v.string(),
    date: v.string(),
    time: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const sessionId = await ctx.db.insert("sessions", {
      requesterId: user._id,
      providerId: args.providerId,
      skillId: args.skillId,
      title: args.title,
      type: "learning",
      status: "pending",
      date: args.date,
      time: args.time,
      rated: false,
    });

    return sessionId;
  },
});

/**
 * PATCH /api/sessions/:id — 接受/取消/完成会话
 */
export const updateStatus = mutation({
  args: {
    sessionId: v.id("sessions"),
    status: v.union(
      v.literal("upcoming"),
      v.literal("pending"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    roomLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("会话不存在");

    const isParticipant =
      session.requesterId === user._id || session.providerId === user._id;
    if (!isParticipant) throw new Error("无权操作此会话");

    const updates: Record<string, unknown> = { status: args.status };
    if (args.roomLink) updates.roomLink = args.roomLink;

    await ctx.db.patch(args.sessionId, updates);
    return { success: true };
  },
});
