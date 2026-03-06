import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================================
  // 核心用户表：关联 Clerk + TrueSkill 评分 + NFT 凭证
  // ============================================================
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
    title: v.optional(v.string()),
    location: v.optional(v.string()),
    bio: v.optional(v.string()),
    level: v.optional(v.string()),
    trustScore: v.optional(v.number()),
    credits: v.optional(v.number()),
    isPro: v.optional(v.boolean()),
    speaks: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    skillTags: v.array(v.string()),
    skillRatings: v.array(
      v.object({
        skillTag: v.string(),
        mu: v.number(),
        sigma: v.number(),
      })
    ),
    nftSkills: v.array(
      v.object({
        tokenId: v.string(),
        skillTag: v.string(),
        swapCount: v.number(),
        metadataUri: v.string(),
      })
    ),
    onboardingCompleted: v.optional(v.boolean()),
    onboardingData: v.optional(
      v.object({
        goals: v.optional(v.array(v.string())),
        preferredLanguages: v.optional(v.array(v.string())),
        selectedSkills: v.optional(v.array(v.string())),
        availability: v.optional(v.string()),
      })
    ),
  })
    .index("by_clerkId", ["clerkId"])
    .searchIndex("search_name", { searchField: "name" }),

  // ============================================================
  // 技能表：用户发布的可交换技能
  // ============================================================
  skills: defineTable({
    userId: v.id("users"),
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
    rating: v.optional(v.number()),
    lessons: v.optional(v.number()),
    price: v.optional(v.string()),
    isAvailable: v.boolean(),
    nftTokenId: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_skillTag", ["skillTag"])
    .index("by_category", ["category"])
    .searchIndex("search_title", { searchField: "title" }),

  // ============================================================
  // 交换会话表：核心业务流水
  // ============================================================
  sessions: defineTable({
    type: v.union(v.literal("learning"), v.literal("teaching")),
    status: v.union(
      v.literal("upcoming"),
      v.literal("pending"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    title: v.string(),
    requesterId: v.id("users"),
    providerId: v.id("users"),
    skillId: v.optional(v.id("skills")),
    partnerName: v.optional(v.string()),
    partnerAvatar: v.optional(v.string()),
    date: v.string(),
    time: v.string(),
    roomLink: v.optional(v.string()),
    rated: v.optional(v.boolean()),
    requesterScore: v.optional(v.number()),
    providerScore: v.optional(v.number()),
    ratingUpdate: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          skillTag: v.string(),
          oldMu: v.number(),
          newMu: v.number(),
        })
      )
    ),
  })
    .index("by_requesterId", ["requesterId"])
    .index("by_providerId", ["providerId"])
    .index("by_status", ["status"]),

  // ============================================================
  // 联系人表
  // ============================================================
  contacts: defineTable({
    userId: v.id("users"),
    contactUserId: v.id("users"),
    name: v.string(),
    avatar: v.optional(v.string()),
    lastMsg: v.optional(v.string()),
    lastMsgTime: v.optional(v.number()),
    unread: v.optional(v.number()),
    status: v.optional(v.string()),
    skill: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_contactUserId", ["contactUserId"]),

  // ============================================================
  // 消息表
  // ============================================================
  messages: defineTable({
    conversationId: v.string(),
    senderId: v.id("users"),
    receiverId: v.id("users"),
    type: v.union(
      v.literal("text"),
      v.literal("skill_request"),
      v.literal("system"),
      v.literal("ai_suggestion")
    ),
    text: v.string(),
    status: v.optional(
      v.union(v.literal("sent"), v.literal("delivered"), v.literal("read"))
    ),
    skillMe: v.optional(v.string()),
    skillThem: v.optional(v.string()),
    timeSlot: v.optional(v.string()),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_senderId", ["senderId"])
    .index("by_receiverId", ["receiverId"]),

  // ============================================================
  // 社区帖子表
  // ============================================================
  posts: defineTable({
    userId: v.id("users"),
    authorName: v.string(),
    authorAvatar: v.optional(v.string()),
    content: v.string(),
    image: v.optional(v.string()),
    likes: v.optional(v.number()),
    comments: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    type: v.optional(v.string()),
  })
    .index("by_userId", ["userId"]),

  // ============================================================
  // 社区动态表
  // ============================================================
  communityUpdates: defineTable({
    userId: v.optional(v.id("users")),
    userName: v.string(),
    userAvatar: v.optional(v.string()),
    action: v.string(),
    detail: v.optional(v.string()),
    type: v.optional(v.string()),
  }),

  // ============================================================
  // 评价表
  // ============================================================
  reviews: defineTable({
    userId: v.id("users"),
    reviewerId: v.id("users"),
    reviewerName: v.string(),
    reviewerAvatar: v.optional(v.string()),
    rating: v.number(),
    comment: v.string(),
    skillTag: v.optional(v.string()),
    sessionId: v.optional(v.id("sessions")),
  })
    .index("by_userId", ["userId"])
    .index("by_reviewerId", ["reviewerId"]),

  // ============================================================
  // AI 匹配缓存表：避免重复计算（1 小时过期）
  // ============================================================
  matchCache: defineTable({
    userId: v.id("users"),
    matches: v.array(
      v.object({
        targetId: v.id("users"),
        skillTag: v.string(),
        matchScore: v.number(),
        nftProof: v.string(),
      })
    ),
    expiresAt: v.number(),
  }).index("by_userId", ["userId"]),

  // ============================================================
  // AI 对话历史表
  // ============================================================
  aiConversations: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("match"), v.literal("translate"), v.literal("general")),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
        content: v.string(),
      })
    ),
  }).index("by_userId", ["userId"]),
});
