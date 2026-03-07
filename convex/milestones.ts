import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./auth";
import { Id } from "./_generated/dataModel";

/**
 * Soul 式成就系统 — 里程碑定义
 * 根据双方互动数据自动解锁成就勋章
 */
const BADGE_DEFINITIONS = [
  {
    badge: "first_exchange",
    name: "初次交换",
    icon: "🤝",
    condition: (stats: MilestoneStats) => stats.sessionCount >= 1,
    description: "完成第一次技能交换",
  },
  {
    badge: "active_learner",
    name: "活跃学习者",
    icon: "📚",
    condition: (stats: MilestoneStats) => stats.feedbackCount >= 3,
    description: "发布 3 条以上学习反馈",
  },
  {
    badge: "deep_talk",
    name: "知音",
    icon: "💬",
    condition: (stats: MilestoneStats) => stats.messageCount >= 50,
    description: "私聊消息超过 50 条",
  },
  {
    badge: "weekly_streak",
    name: "默契搭档",
    icon: "⚡",
    condition: (stats: MilestoneStats) =>
      stats.totalInteractionDays >= 7 && stats.sessionCount >= 3,
    description: "互动超过 7 天且完成 3 次交换",
  },
  {
    badge: "soulmate",
    name: "灵魂伙伴",
    icon: "✨",
    condition: (stats: MilestoneStats) =>
      stats.totalInteractionDays >= 30 &&
      stats.sessionCount >= 5 &&
      stats.messageCount >= 200 &&
      stats.feedbackCount >= 10,
    description: "30 天深度互动，5 次交换，200+ 消息，10+ 反馈",
  },
];

type MilestoneStats = {
  messageCount: number;
  sessionCount: number;
  feedbackCount: number;
  totalInteractionDays: number;
};

function sortUserIds(a: Id<"users">, b: Id<"users">): [Id<"users">, Id<"users">] {
  return a < b ? [a, b] : [b, a];
}

function calculateRelationLevel(
  badges: string[]
): "stranger" | "acquaintance" | "partner" | "soulmate" {
  if (badges.includes("soulmate")) return "soulmate";
  if (badges.includes("weekly_streak")) return "partner";
  if (badges.includes("first_exchange")) return "acquaintance";
  return "stranger";
}

/**
 * 更新双方互动数据并检查是否解锁新成就
 * 每次消息发送/会话完成/反馈发布时自动调用
 */
export const updateInteraction = mutation({
  args: {
    targetUserId: v.id("users"),
    interactionType: v.union(
      v.literal("message"),
      v.literal("session_complete"),
      v.literal("feedback")
    ),
    skillTag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const [userIdA, userIdB] = sortUserIds(user._id, args.targetUserId);

    let milestone = await ctx.db
      .query("milestones")
      .withIndex("by_pair", (q) =>
        q.eq("userIdA", userIdA).eq("userIdB", userIdB)
      )
      .unique();

    if (!milestone) {
      const milestoneId = await ctx.db.insert("milestones", {
        userIdA,
        userIdB,
        skillTag: args.skillTag ?? "",
        messageCount: 0,
        sessionCount: 0,
        feedbackCount: 0,
        totalInteractionDays: 1,
        unlockedBadges: [],
        relationLevel: "stranger",
        lastInteractionAt: Date.now(),
      });
      milestone = await ctx.db.get(milestoneId);
      if (!milestone) throw new Error("创建里程碑失败");
    }

    const updates: Record<string, unknown> = {
      lastInteractionAt: Date.now(),
    };

    switch (args.interactionType) {
      case "message":
        updates.messageCount = milestone.messageCount + 1;
        break;
      case "session_complete":
        updates.sessionCount = milestone.sessionCount + 1;
        break;
      case "feedback":
        updates.feedbackCount = milestone.feedbackCount + 1;
        break;
    }

    const lastDate = new Date(milestone.lastInteractionAt).toDateString();
    const today = new Date().toDateString();
    if (lastDate !== today) {
      updates.totalInteractionDays = milestone.totalInteractionDays + 1;
    }

    if (args.skillTag && !milestone.skillTag) {
      updates.skillTag = args.skillTag;
    }

    await ctx.db.patch(milestone._id, updates);

    const currentStats: MilestoneStats = {
      messageCount: (updates.messageCount as number) ?? milestone.messageCount,
      sessionCount: (updates.sessionCount as number) ?? milestone.sessionCount,
      feedbackCount: (updates.feedbackCount as number) ?? milestone.feedbackCount,
      totalInteractionDays:
        (updates.totalInteractionDays as number) ?? milestone.totalInteractionDays,
    };

    const existingBadgeIds = new Set(
      milestone.unlockedBadges.map((b) => b.badge)
    );
    const newBadges: typeof milestone.unlockedBadges = [];

    for (const def of BADGE_DEFINITIONS) {
      if (!existingBadgeIds.has(def.badge) && def.condition(currentStats)) {
        newBadges.push({
          badge: def.badge,
          name: def.name,
          icon: def.icon,
          unlockedAt: Date.now(),
        });
      }
    }

    if (newBadges.length > 0) {
      const allBadges = [...milestone.unlockedBadges, ...newBadges];
      const relationLevel = calculateRelationLevel(
        allBadges.map((b) => b.badge)
      );

      await ctx.db.patch(milestone._id, {
        unlockedBadges: allBadges,
        relationLevel,
      });

      for (const badge of newBadges) {
        const partner = await ctx.db.get(args.targetUserId);
        await ctx.db.insert("communityUpdates", {
          userId: user._id,
          userName: user.name,
          userAvatar: user.avatar,
          action: `和 ${partner?.name ?? "伙伴"} 解锁了成就「${badge.icon} ${badge.name}」`,
          type: "milestone",
        });
      }
    }

    return {
      newBadges,
      relationLevel: newBadges.length > 0
        ? calculateRelationLevel([
            ...Array.from(existingBadgeIds),
            ...newBadges.map((b) => b.badge),
          ])
        : milestone.relationLevel,
    };
  },
});

/**
 * 获取与某用户的互动里程碑
 */
export const getMilestone = query({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const [userIdA, userIdB] = sortUserIds(user._id, args.targetUserId);

    const milestone = await ctx.db
      .query("milestones")
      .withIndex("by_pair", (q) =>
        q.eq("userIdA", userIdA).eq("userIdB", userIdB)
      )
      .unique();

    if (!milestone) {
      return {
        relationLevel: "stranger" as const,
        unlockedBadges: [],
        messageCount: 0,
        sessionCount: 0,
        feedbackCount: 0,
        totalInteractionDays: 0,
        allBadges: BADGE_DEFINITIONS.map((d) => ({
          badge: d.badge,
          name: d.name,
          icon: d.icon,
          description: d.description,
          unlocked: false,
        })),
      };
    }

    const unlockedSet = new Set(milestone.unlockedBadges.map((b) => b.badge));

    return {
      ...milestone,
      allBadges: BADGE_DEFINITIONS.map((d) => ({
        badge: d.badge,
        name: d.name,
        icon: d.icon,
        description: d.description,
        unlocked: unlockedSet.has(d.badge),
        unlockedAt: milestone.unlockedBadges.find((b) => b.badge === d.badge)
          ?.unlockedAt,
      })),
    };
  },
});

/**
 * 获取用户所有的成就勋章
 */
export const getMyBadges = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    const asA = await ctx.db
      .query("milestones")
      .withIndex("by_userIdA", (q) => q.eq("userIdA", user._id))
      .collect();

    const asB = await ctx.db
      .query("milestones")
      .withIndex("by_userIdB", (q) => q.eq("userIdB", user._id))
      .collect();

    const all = [...asA, ...asB];
    const badges: Array<{
      badge: string;
      name: string;
      icon: string;
      unlockedAt: number;
      partnerName: string;
      skillTag: string;
    }> = [];

    for (const m of all) {
      const partnerId = m.userIdA === user._id ? m.userIdB : m.userIdA;
      const partner = await ctx.db.get(partnerId);

      for (const b of m.unlockedBadges) {
        badges.push({
          ...b,
          partnerName: partner?.name ?? "未知",
          skillTag: m.skillTag,
        });
      }
    }

    return badges.sort((a, b) => b.unlockedAt - a.unlockedAt);
  },
});
