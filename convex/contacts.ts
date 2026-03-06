import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./auth";

/**
 * GET /api/contacts — 获取当前用户的联系人列表
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    return contacts;
  },
});

/**
 * 添加联系人（交换成功后自动添加）
 */
export const addContact = mutation({
  args: {
    contactUserId: v.id("users"),
    skill: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const contactUser = await ctx.db.get(args.contactUserId);
    if (!contactUser) throw new Error("用户不存在");

    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("contactUserId"), args.contactUserId))
      .unique();

    if (existing) return existing._id;

    const contactId = await ctx.db.insert("contacts", {
      userId: user._id,
      contactUserId: args.contactUserId,
      name: contactUser.name,
      avatar: contactUser.avatar,
      lastMsg: "",
      lastMsgTime: Date.now(),
      unread: 0,
      status: "online",
      skill: args.skill,
    });

    await ctx.db.insert("contacts", {
      userId: args.contactUserId,
      contactUserId: user._id,
      name: user.name,
      avatar: user.avatar,
      lastMsg: "",
      lastMsgTime: Date.now(),
      unread: 0,
      status: "online",
      skill: args.skill,
    });

    return contactId;
  },
});
