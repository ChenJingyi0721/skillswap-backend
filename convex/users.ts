import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthenticatedUser, requireAuth } from "./auth";

/**
 * GET /api/user/me — 获取当前登录用户信息
 * 若用户首次登录，自动创建用户记录（Clerk→Convex 同步）
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const clerkId = identity.subject;
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();

    return user;
  },
});

/**
 * Clerk Webhook / 首次登录时同步创建用户
 */
export const syncUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("未授权");

    const clerkId = identity.subject;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: identity.name ?? existing.name,
        avatar: identity.pictureUrl ?? existing.avatar,
      });
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId,
      name: identity.name ?? "新用户",
      avatar: identity.pictureUrl ?? undefined,
      title: undefined,
      location: undefined,
      bio: undefined,
      level: "beginner",
      trustScore: 50,
      credits: 100,
      isPro: false,
      speaks: [],
      tags: [],
      skillTags: [],
      skillRatings: [],
      nftSkills: [],
      onboardingCompleted: false,
    });

    return userId;
  },
});

/**
 * POST /api/onboarding — 保存 Onboarding 数据
 */
export const completeOnboarding = mutation({
  args: {
    goals: v.optional(v.array(v.string())),
    preferredLanguages: v.optional(v.array(v.string())),
    selectedSkills: v.optional(v.array(v.string())),
    availability: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const skillTags = args.selectedSkills ?? [];
    const skillRatings = skillTags.map((tag) => ({
      skillTag: tag,
      mu: 25.0,
      sigma: 8.33,
    }));

    await ctx.db.patch(user._id, {
      onboardingCompleted: true,
      onboardingData: {
        goals: args.goals,
        preferredLanguages: args.preferredLanguages,
        selectedSkills: args.selectedSkills,
        availability: args.availability,
      },
      skillTags,
      skillRatings,
      speaks: args.preferredLanguages ?? user.speaks,
    });

    return { success: true };
  },
});

/**
 * 更新用户资料
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    speaks: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(user._id, updates);
    return { success: true };
  },
});
