import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { requireAuth } from "./auth";

const PLATFORM_VALUES = v.union(
  v.literal("bilibili"),
  v.literal("xiaohongshu"),
  v.literal("wechat_official"),
  v.literal("youtube")
);

/**
 * 绑定社交媒体账号
 * 用户授权后，前端将平台信息传入
 */
export const linkAccount = mutation({
  args: {
    platform: PLATFORM_VALUES,
    platformUserId: v.string(),
    platformUsername: v.string(),
    profileUrl: v.string(),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const existing = await ctx.db
      .query("socialMediaAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        platformUserId: args.platformUserId,
        platformUsername: args.platformUsername,
        profileUrl: args.profileUrl,
        accessToken: args.accessToken,
        isVerified: true,
        linkedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("socialMediaAccounts", {
      userId: user._id,
      platform: args.platform,
      platformUserId: args.platformUserId,
      platformUsername: args.platformUsername,
      profileUrl: args.profileUrl,
      accessToken: args.accessToken,
      isVerified: true,
      linkedAt: Date.now(),
    });
  },
});

/**
 * 获取用户已绑定的社交媒体账号
 */
export const getLinkedAccounts = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const targetId = args.userId ?? (await requireAuth(ctx))._id;

    const accounts = await ctx.db
      .query("socialMediaAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", targetId))
      .collect();

    return accounts.map((a) => ({
      _id: a._id,
      platform: a.platform,
      platformUsername: a.platformUsername,
      profileUrl: a.profileUrl,
      isVerified: a.isVerified,
      linkedAt: a.linkedAt,
    }));
  },
});

/**
 * AI 分析社交媒体内容
 * 让 AI 读取解析用户在外部平台发布的内容，从持续性、深度、社区认可三个维度打分
 */
export const analyzeAccount = action({
  args: {
    accountId: v.id("socialMediaAccounts"),
    skillTag: v.string(),
  },
  handler: async (ctx, args) => {
    const account: any = await ctx.runQuery(
      "socialMedia:getAccountById" as any,
      { accountId: args.accountId }
    );
    if (!account) throw new Error("账号不存在");

    const platformLabels: Record<string, string> = {
      bilibili: "B站",
      xiaohongshu: "小红书",
      youtube: "YouTube",
      wechat_official: "微信公众号",
    };

    const prompt = `你是一个技能评估专家。请分析以下社交媒体账号在「${args.skillTag}」这个技能领域的表现。

平台：${platformLabels[account.platform] ?? account.platform}
用户名：${account.platformUsername}
主页链接：${account.profileUrl}

请从以下三个维度评分（0-100分），并给出分析报告：

1. **持续性 (consistencyScore)**：该用户是否长期坚持在这个领域输出内容？发布频率如何？是否有中断？
   - 90-100：每周多次更新，坚持1年以上
   - 70-89：每周至少1次，坚持半年以上
   - 50-69：不定期更新，但有一定数量的内容
   - 30-49：偶尔发布，内容较少
   - 0-29：几乎没有相关内容

2. **深度 (depthScore)**：内容的专业程度如何？是浅层分享还是深度教学？
   - 90-100：系统性教程/专业级别内容
   - 70-89：有深度的经验分享和技巧讲解
   - 50-69：中等深度，有一定干货
   - 30-49：较浅层，以展示为主
   - 0-29：几乎无专业内容

3. **社区认可 (engagementScore)**：粉丝互动质量如何？评论区反馈如何？
   - 90-100：大量正面反馈，粉丝活跃参与讨论
   - 70-89：有稳定的互动和好评
   - 50-69：有一定互动
   - 30-49：互动较少
   - 0-29：几乎无互动

请以 JSON 格式返回：
{
  "consistencyScore": 数字,
  "depthScore": 数字,
  "engagementScore": 数字,
  "overallScore": 数字（三项加权平均：持续性40% + 深度35% + 认可25%）,
  "analysisReport": "200字以内的分析报告",
  "contentSamples": [
    {"title": "内容标题示例", "type": "video|article|image", "relevanceScore": 0-100}
  ]
}`;

    try {
      const response = await fetch(
        process.env.OPENAI_BASE_URL
          ? `${process.env.OPENAI_BASE_URL}/chat/completions`
          : "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: process.env.AI_MODEL ?? "gpt-4o-mini",
            messages: [
              { role: "system", content: "你是一个专业的技能评估 AI。请严格按照 JSON 格式返回评估结果，不要包含任何额外文字。" },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 1200,
          }),
        }
      );

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? "";

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI 返回格式异常");

      const result = JSON.parse(jsonMatch[0]);

      await ctx.runMutation("socialMedia:saveAnalysis" as any, {
        userId: account.userId,
        accountId: args.accountId,
        skillTag: args.skillTag,
        consistencyScore: result.consistencyScore ?? 50,
        depthScore: result.depthScore ?? 50,
        engagementScore: result.engagementScore ?? 50,
        overallScore: result.overallScore ?? 50,
        analysisReport: result.analysisReport ?? "分析完成",
        contentSamples: (result.contentSamples ?? []).slice(0, 5),
      });

      return result;
    } catch (error) {
      return {
        consistencyScore: 50,
        depthScore: 50,
        engagementScore: 50,
        overallScore: 50,
        analysisReport: "AI 分析暂不可用，已使用默认评分。请稍后重试。",
        contentSamples: [],
      };
    }
  },
});

/**
 * 内部查询：通过 ID 获取账号（供 action 使用）
 */
export const getAccountById = query({
  args: { accountId: v.id("socialMediaAccounts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.accountId);
  },
});

/**
 * 保存 AI 分析结果
 */
export const saveAnalysis = mutation({
  args: {
    userId: v.id("users"),
    accountId: v.id("socialMediaAccounts"),
    skillTag: v.string(),
    consistencyScore: v.number(),
    depthScore: v.number(),
    engagementScore: v.number(),
    overallScore: v.number(),
    analysisReport: v.string(),
    contentSamples: v.array(
      v.object({
        title: v.string(),
        url: v.optional(v.string()),
        type: v.union(v.literal("video"), v.literal("article"), v.literal("image")),
        relevanceScore: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("socialMediaAnalysis")
      .withIndex("by_accountId", (q) => q.eq("accountId", args.accountId))
      .filter((q) => q.eq(q.field("skillTag"), args.skillTag))
      .unique();

    const analysisData = {
      userId: args.userId,
      accountId: args.accountId,
      skillTag: args.skillTag,
      consistencyScore: args.consistencyScore,
      depthScore: args.depthScore,
      engagementScore: args.engagementScore,
      overallScore: args.overallScore,
      analysisReport: args.analysisReport,
      contentSamples: args.contentSamples,
      analyzedAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000, // 7 天有效期
    };

    if (existing) {
      await ctx.db.patch(existing._id, analysisData);
      return existing._id;
    }

    return await ctx.db.insert("socialMediaAnalysis", analysisData);
  },
});

/**
 * 获取用户某技能的社交媒体综合评分
 */
export const getSocialScore = query({
  args: {
    userId: v.optional(v.id("users")),
    skillTag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const targetId = args.userId ?? (await requireAuth(ctx))._id;

    const analyses = await ctx.db
      .query("socialMediaAnalysis")
      .withIndex("by_userId", (q) => q.eq("userId", targetId))
      .collect();

    const valid = analyses.filter(
      (a) =>
        a.expiresAt > Date.now() &&
        (!args.skillTag || a.skillTag === args.skillTag)
    );

    if (valid.length === 0) return { score: 0, analyses: [] };

    const avgScore =
      valid.reduce((sum, a) => sum + a.overallScore, 0) / valid.length;

    return {
      score: Math.round(avgScore),
      analyses: valid.map((a) => ({
        skillTag: a.skillTag,
        overallScore: a.overallScore,
        consistencyScore: a.consistencyScore,
        depthScore: a.depthScore,
        engagementScore: a.engagementScore,
        analysisReport: a.analysisReport,
        analyzedAt: a.analyzedAt,
      })),
    };
  },
});

/**
 * 解除社交媒体账号绑定
 */
export const unlinkAccount = mutation({
  args: { accountId: v.id("socialMediaAccounts") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const account = await ctx.db.get(args.accountId);
    if (!account || account.userId !== user._id) {
      throw new Error("无权操作");
    }
    await ctx.db.delete(args.accountId);
    return { success: true };
  },
});
