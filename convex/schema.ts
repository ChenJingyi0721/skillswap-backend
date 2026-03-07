import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================================
  // 核心用户表：关联 Clerk + TrueSkill + 渐进式评分 + NFT
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
    // 渐进式评分：AI 社交媒体分析得分（0~100）
    socialScore: v.optional(v.number()),
    // 渐进式评分：社区反馈综合得分（0~100）
    communityScore: v.optional(v.number()),
    // 渐进式综合评分 = 社交30% + 社区50% + NFT成就20%
    progressiveRating: v.optional(v.number()),
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

  // ============================================================
  // 社交媒体账号表：用户授权绑定的外部平台
  // ============================================================
  socialMediaAccounts: defineTable({
    userId: v.id("users"),
    platform: v.union(
      v.literal("bilibili"),
      v.literal("xiaohongshu"),
      v.literal("wechat_official"),
      v.literal("youtube")
    ),
    platformUserId: v.string(),
    platformUsername: v.string(),
    profileUrl: v.string(),
    accessToken: v.optional(v.string()),
    isVerified: v.boolean(),
    linkedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_platform_user", ["platform", "platformUserId"]),

  // ============================================================
  // 社交媒体 AI 分析结果表
  // ============================================================
  socialMediaAnalysis: defineTable({
    userId: v.id("users"),
    accountId: v.id("socialMediaAccounts"),
    skillTag: v.string(),
    // AI 分析维度
    consistencyScore: v.number(),   // 持续性：长期坚持输出 (0~100)
    depthScore: v.number(),         // 深度：内容专业程度 (0~100)
    engagementScore: v.number(),    // 社区认可：互动质量 (0~100)
    overallScore: v.number(),       // 综合得分 (0~100)
    // AI 分析报告
    analysisReport: v.string(),
    contentSamples: v.array(
      v.object({
        title: v.string(),
        url: v.optional(v.string()),
        type: v.union(v.literal("video"), v.literal("article"), v.literal("image")),
        relevanceScore: v.number(),
      })
    ),
    analyzedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_accountId", ["accountId"]),

  // ============================================================
  // 交换反馈帖表：交换确认后自动开启的公开反馈区
  // ============================================================
  exchangeThreads: defineTable({
    sessionId: v.id("sessions"),
    requesterId: v.id("users"),
    providerId: v.id("users"),
    skillTag: v.string(),
    title: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("archived")
    ),
    postCount: v.number(),
    lastActivityAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_requesterId", ["requesterId"])
    .index("by_providerId", ["providerId"]),

  // ============================================================
  // 交换反馈帖子表：反馈帖内的进度更新
  // ============================================================
  exchangeThreadPosts: defineTable({
    threadId: v.id("exchangeThreads"),
    authorId: v.id("users"),
    authorName: v.string(),
    authorAvatar: v.optional(v.string()),
    content: v.string(),
    image: v.optional(v.string()),
    type: v.union(
      v.literal("progress"),      // 学习进度
      v.literal("feedback"),      // 反馈评价
      v.literal("milestone"),     // 里程碑达成
      v.literal("shoutout")       // 公开表扬
    ),
    likes: v.number(),
  })
    .index("by_threadId", ["threadId"])
    .index("by_authorId", ["authorId"]),

  // ============================================================
  // 互动里程碑表：Soul 式成就点亮系统
  // ============================================================
  milestones: defineTable({
    // 双方用户（排序后存储，确保唯一性）
    userIdA: v.id("users"),
    userIdB: v.id("users"),
    skillTag: v.string(),
    // 互动统计
    messageCount: v.number(),
    sessionCount: v.number(),
    feedbackCount: v.number(),
    totalInteractionDays: v.number(),
    // 已点亮的成就
    unlockedBadges: v.array(
      v.object({
        badge: v.string(),        // 成就标识
        name: v.string(),         // "初次交换" "知音" "默契搭档" "灵魂伙伴"
        unlockedAt: v.number(),
        icon: v.string(),         // emoji 或图标
      })
    ),
    // 当前关系等级
    relationLevel: v.union(
      v.literal("stranger"),      // 陌生人
      v.literal("acquaintance"),  // 初识
      v.literal("partner"),       // 搭档
      v.literal("soulmate")      // 灵魂伙伴
    ),
    lastInteractionAt: v.number(),
  })
    .index("by_userIdA", ["userIdA"])
    .index("by_userIdB", ["userIdB"])
    .index("by_pair", ["userIdA", "userIdB"]),

  // ============================================================
  // NFT 故事表：交换见证 + 贡献度分配 + 橱窗展示
  // ============================================================
  nftStories: defineTable({
    tokenId: v.string(),
    sessionId: v.id("sessions"),
    skillTag: v.string(),
    // 双方信息及贡献度
    providerId: v.id("users"),
    requesterId: v.id("users"),
    providerContribution: v.number(),   // 0~100
    requesterContribution: v.number(),  // 0~100
    // AI 生成的交换故事
    storyTitle: v.string(),
    storySummary: v.string(),
    storyHighlights: v.array(v.string()),
    // 关联数据
    threadId: v.optional(v.id("exchangeThreads")),
    milestoneId: v.optional(v.id("milestones")),
    metadataUri: v.string(),
    // 橱窗可见性
    isPublic: v.boolean(),
    viewCount: v.number(),
  })
    .index("by_providerId", ["providerId"])
    .index("by_requesterId", ["requesterId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_tokenId", ["tokenId"]),
});
