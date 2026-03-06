import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./auth";

/**
 * 生成两个用户之间的会话 ID（确保双向一致）
 */
function getConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join("_");
}

/**
 * GET /api/messages/:contactId — 获取与某联系人的消息历史
 */
export const listByContact = query({
  args: {
    contactId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const conversationId = getConversationId(
      user._id as string,
      args.contactId as string
    );

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", conversationId)
      )
      .collect();

    return messages.map((m) => ({
      ...m,
      sender: m.senderId === user._id ? "me" : "them",
    }));
  },
});

/**
 * POST /api/messages/:contactId — 发送消息
 */
export const send = mutation({
  args: {
    contactId: v.id("users"),
    text: v.string(),
    type: v.optional(
      v.union(
        v.literal("text"),
        v.literal("skill_request"),
        v.literal("system"),
        v.literal("ai_suggestion")
      )
    ),
    skillMe: v.optional(v.string()),
    skillThem: v.optional(v.string()),
    timeSlot: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const conversationId = getConversationId(
      user._id as string,
      args.contactId as string
    );

    const messageId = await ctx.db.insert("messages", {
      conversationId,
      senderId: user._id,
      receiverId: args.contactId,
      type: args.type ?? "text",
      text: args.text,
      status: "sent",
      skillMe: args.skillMe,
      skillThem: args.skillThem,
      timeSlot: args.timeSlot,
    });

    const myContact = await ctx.db
      .query("contacts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("contactUserId"), args.contactId))
      .unique();

    if (myContact) {
      await ctx.db.patch(myContact._id, {
        lastMsg: args.text,
        lastMsgTime: Date.now(),
      });
    }

    const theirContact = await ctx.db
      .query("contacts")
      .withIndex("by_userId", (q) => q.eq("userId", args.contactId))
      .filter((q) => q.eq(q.field("contactUserId"), user._id))
      .unique();

    if (theirContact) {
      await ctx.db.patch(theirContact._id, {
        lastMsg: args.text,
        lastMsgTime: Date.now(),
        unread: (theirContact.unread ?? 0) + 1,
      });
    }

    return messageId;
  },
});

/**
 * 标记消息为已读
 */
export const markRead = mutation({
  args: {
    contactId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const myContact = await ctx.db
      .query("contacts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("contactUserId"), args.contactId))
      .unique();

    if (myContact) {
      await ctx.db.patch(myContact._id, { unread: 0 });
    }

    return { success: true };
  },
});
