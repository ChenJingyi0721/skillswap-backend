import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth, getAuthenticatedUser } from "./auth";

/**
 * GET /api/skills — 获取技能列表，支持 category / search 过滤
 */
export const list = query({
  args: {
    category: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let skills;

    if (args.search) {
      skills = await ctx.db
        .query("skills")
        .withSearchIndex("search_title", (q) => q.search("title", args.search!))
        .collect();
    } else if (args.category) {
      skills = await ctx.db
        .query("skills")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    } else {
      skills = await ctx.db.query("skills").collect();
    }

    const enriched = await Promise.all(
      skills.map(async (skill) => {
        const user = await ctx.db.get(skill.userId);
        return {
          ...skill,
          user: user?.name ?? "未知用户",
          avatar: user?.avatar,
          speaks: user?.speaks ?? [],
        };
      })
    );

    return enriched;
  },
});

/**
 * GET /api/skills/:id — 获取单个技能详情
 */
export const getById = query({
  args: { skillId: v.id("skills") },
  handler: async (ctx, args) => {
    const skill = await ctx.db.get(args.skillId);
    if (!skill) return null;

    const user = await ctx.db.get(skill.userId);
    return {
      ...skill,
      user: user?.name ?? "未知用户",
      avatar: user?.avatar,
      speaks: user?.speaks ?? [],
      trustScore: user?.trustScore,
    };
  },
});

/**
 * POST /api/skills — 发布新技能
 */
export const create = mutation({
  args: {
    skillTag: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    level: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    ),
    type: v.optional(v.union(v.literal("teaching"), v.literal("learning"))),
    image: v.optional(v.string()),
    price: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const skillId = await ctx.db.insert("skills", {
      userId: user._id,
      skillTag: args.skillTag,
      title: args.title,
      description: args.description,
      category: args.category,
      level: args.level,
      type: args.type,
      image: args.image,
      price: args.price,
      rating: 0,
      lessons: 0,
      isAvailable: true,
    });

    if (!user.skillTags.includes(args.skillTag)) {
      await ctx.db.patch(user._id, {
        skillTags: [...user.skillTags, args.skillTag],
        skillRatings: [
          ...user.skillRatings,
          { skillTag: args.skillTag, mu: 25.0, sigma: 8.33 },
        ],
      });
    }

    return skillId;
  },
});

/**
 * GET /api/similar-experts — 按技能推荐相似专家
 */
export const getSimilarExperts = query({
  args: {
    skillTag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!args.skillTag) return [];

    const skills = await ctx.db
      .query("skills")
      .withIndex("by_skillTag", (q) => q.eq("skillTag", args.skillTag!))
      .filter((q) => q.eq(q.field("isAvailable"), true))
      .collect();

    const experts = await Promise.all(
      skills
        .filter((s) => !user || s.userId !== user._id)
        .slice(0, 5)
        .map(async (s) => {
          const u = await ctx.db.get(s.userId);
          return {
            id: s._id,
            name: u?.name ?? "未知",
            avatar: u?.avatar,
            title: s.title,
            rating: s.rating ?? 0,
            level: s.level,
            skillTag: s.skillTag,
            trustScore: u?.trustScore ?? 0,
          };
        })
    );

    return experts;
  },
});
