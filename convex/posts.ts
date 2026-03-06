import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth, getAuthenticatedUser } from "./auth";

/**
 * GET /api/posts — 获取社区帖子列表
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").order("desc").collect();
    return posts;
  },
});

/**
 * GET /api/user-posts — 获取当前用户的帖子
 */
export const listByCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return posts;
  },
});

/**
 * POST /api/posts — 发布社区帖子
 */
export const create = mutation({
  args: {
    content: v.string(),
    image: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const postId = await ctx.db.insert("posts", {
      userId: user._id,
      authorName: user.name,
      authorAvatar: user.avatar,
      content: args.content,
      image: args.image,
      tags: args.tags,
      type: args.type,
      likes: 0,
      comments: 0,
    });

    await ctx.db.insert("communityUpdates", {
      userId: user._id,
      userName: user.name,
      userAvatar: user.avatar,
      action: "发布了新帖子",
      detail: args.content.slice(0, 50),
      type: "post",
    });

    return postId;
  },
});

/**
 * GET /api/community — 获取社区动态
 */
export const listCommunityUpdates = query({
  args: {},
  handler: async (ctx) => {
    const updates = await ctx.db
      .query("communityUpdates")
      .order("desc")
      .take(20);
    return updates;
  },
});

/**
 * GET /api/reviews — 获取当前用户收到的评价
 */
export const listReviews = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return reviews;
  },
});
