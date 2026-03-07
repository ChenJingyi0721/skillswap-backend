import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./auth";

/**
 * 自动创建交换反馈帖
 * 当双方确认交换（session 状态变为 upcoming）时自动触发
 */
export const createThread = mutation({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("会话不存在");

    const isParticipant =
      session.requesterId === user._id || session.providerId === user._id;
    if (!isParticipant) throw new Error("无权操作");

    const existing = await ctx.db
      .query("exchangeThreads")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (existing) return existing._id;

    const requester = await ctx.db.get(session.requesterId);
    const provider = await ctx.db.get(session.providerId);

    const threadId = await ctx.db.insert("exchangeThreads", {
      sessionId: args.sessionId,
      requesterId: session.requesterId,
      providerId: session.providerId,
      skillTag: session.title,
      title: `${requester?.name ?? "学习者"} × ${provider?.name ?? "教授者"}：${session.title} 技能交换`,
      status: "active",
      postCount: 0,
      lastActivityAt: Date.now(),
    });

    await ctx.db.insert("exchangeThreadPosts", {
      threadId,
      authorId: user._id,
      authorName: user.name,
      authorAvatar: user.avatar,
      content: `🎉 技能交换正式开始！${requester?.name} 和 ${provider?.name} 将围绕「${session.title}」展开交换学习。期待双方的精彩互动！`,
      type: "milestone",
      likes: 0,
    });

    await ctx.db.patch(threadId, { postCount: 1 });

    await ctx.db.insert("communityUpdates", {
      userId: user._id,
      userName: user.name,
      userAvatar: user.avatar,
      action: `开启了「${session.title}」技能交换反馈帖`,
      type: "thread",
    });

    return threadId;
  },
});

/**
 * 发布反馈帖子（进度更新/反馈/里程碑/表扬）
 */
export const addPost = mutation({
  args: {
    threadId: v.id("exchangeThreads"),
    content: v.string(),
    image: v.optional(v.string()),
    type: v.union(
      v.literal("progress"),
      v.literal("feedback"),
      v.literal("milestone"),
      v.literal("shoutout")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("帖子不存在");
    if (thread.status !== "active") throw new Error("该反馈帖已归档");

    const isParticipant =
      thread.requesterId === user._id || thread.providerId === user._id;
    if (!isParticipant) throw new Error("只有交换双方可以发布反馈");

    const postId = await ctx.db.insert("exchangeThreadPosts", {
      threadId: args.threadId,
      authorId: user._id,
      authorName: user.name,
      authorAvatar: user.avatar,
      content: args.content,
      image: args.image,
      type: args.type,
      likes: 0,
    });

    await ctx.db.patch(args.threadId, {
      postCount: thread.postCount + 1,
      lastActivityAt: Date.now(),
    });

    return postId;
  },
});

/**
 * 获取交换反馈帖详情 + 帖子列表
 */
export const getThread = query({
  args: { threadId: v.id("exchangeThreads") },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;

    const posts = await ctx.db
      .query("exchangeThreadPosts")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .collect();

    const requester = await ctx.db.get(thread.requesterId);
    const provider = await ctx.db.get(thread.providerId);

    return {
      ...thread,
      requesterName: requester?.name,
      requesterAvatar: requester?.avatar,
      providerName: provider?.name,
      providerAvatar: provider?.avatar,
      posts,
    };
  },
});

/**
 * 获取某会话的反馈帖
 */
export const getThreadBySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("exchangeThreads")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();
  },
});

/**
 * 获取公开的反馈帖列表（社区浏览）
 */
export const listPublicThreads = query({
  args: {},
  handler: async (ctx) => {
    const threads = await ctx.db
      .query("exchangeThreads")
      .order("desc")
      .take(20);

    return await Promise.all(
      threads.map(async (t) => {
        const requester = await ctx.db.get(t.requesterId);
        const provider = await ctx.db.get(t.providerId);
        return {
          ...t,
          requesterName: requester?.name,
          requesterAvatar: requester?.avatar,
          providerName: provider?.name,
          providerAvatar: provider?.avatar,
        };
      })
    );
  },
});

/**
 * 获取用户参与的所有反馈帖
 */
export const getMyThreads = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    const asRequester = await ctx.db
      .query("exchangeThreads")
      .withIndex("by_requesterId", (q) => q.eq("requesterId", user._id))
      .collect();

    const asProvider = await ctx.db
      .query("exchangeThreads")
      .withIndex("by_providerId", (q) => q.eq("providerId", user._id))
      .collect();

    const all = [...asRequester, ...asProvider].sort(
      (a, b) => b.lastActivityAt - a.lastActivityAt
    );

    return all;
  },
});

/**
 * 点赞反馈帖子
 */
export const likePost = mutation({
  args: { postId: v.id("exchangeThreadPosts") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("帖子不存在");
    await ctx.db.patch(args.postId, { likes: post.likes + 1 });
    return { success: true };
  },
});
