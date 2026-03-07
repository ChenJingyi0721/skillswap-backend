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
 * 状态变更时自动触发：
 * - upcoming → 自动创建交换反馈帖
 * - completed → 自动更新里程碑
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

    // 交换确认 → 自动创建反馈帖
    if (args.status === "upcoming") {
      const existingThread = await ctx.db
        .query("exchangeThreads")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
        .unique();

      if (!existingThread) {
        const requester = await ctx.db.get(session.requesterId);
        const provider = await ctx.db.get(session.providerId);

        await ctx.db.insert("exchangeThreads", {
          sessionId: args.sessionId,
          requesterId: session.requesterId,
          providerId: session.providerId,
          skillTag: session.title,
          title: `${requester?.name ?? "学习者"} × ${provider?.name ?? "教授者"}：${session.title}`,
          status: "active",
          postCount: 1,
          lastActivityAt: Date.now(),
        });
      }
    }

    // 交换完成 → 更新里程碑互动数据
    if (args.status === "completed") {
      const partnerId =
        session.requesterId === user._id
          ? session.providerId
          : session.requesterId;

      const [userIdA, userIdB] =
        user._id < partnerId ? [user._id, partnerId] : [partnerId, user._id];

      const milestone = await ctx.db
        .query("milestones")
        .withIndex("by_pair", (q) =>
          q.eq("userIdA", userIdA).eq("userIdB", userIdB)
        )
        .unique();

      if (milestone) {
        await ctx.db.patch(milestone._id, {
          sessionCount: milestone.sessionCount + 1,
          lastInteractionAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});
