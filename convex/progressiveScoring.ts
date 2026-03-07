import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./auth";

/**
 * 渐进式综合评分引擎
 *
 * 综合评分 = AI 社交媒体分析 (30%) + 社区反馈 (50%) + NFT 成就 (20%)
 *
 * 维度一 — 社交媒体 (socialScore):
 *   AI 分析用户在 B站/小红书/YouTube/公众号 上的内容
 *   评估：持续性(40%) + 深度(35%) + 社区认可(25%)
 *
 * 维度二 — 社区反馈 (communityScore):
 *   TrueSkill 评分 + 互评得分 + 反馈帖活跃度
 *   评估：平均互评分(40%) + TrueSkill mu值(30%) + 反馈帖活跃度(30%)
 *
 * 维度三 — NFT 成就 (achievementScore):
 *   NFT 数量 + 交换次数 + 解锁成就数
 *   评估：NFT 数量(30%) + 总交换次数(40%) + 成就勋章(30%)
 */

/**
 * 重新计算并更新用户的渐进式综合评分
 */
export const recalculate = mutation({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = args.userId
      ? await ctx.db.get(args.userId)
      : await requireAuth(ctx);
    if (!user) throw new Error("用户不存在");

    // ========== 维度一：社交媒体评分 (0~100) ==========
    const socialAnalyses = await ctx.db
      .query("socialMediaAnalysis")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const validAnalyses = socialAnalyses.filter((a) => a.expiresAt > Date.now());
    const socialScore =
      validAnalyses.length > 0
        ? Math.round(
            validAnalyses.reduce((s, a) => s + a.overallScore, 0) /
              validAnalyses.length
          )
        : 0;

    // ========== 维度二：社区反馈评分 (0~100) ==========
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const avgReviewScore =
      reviews.length > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : 0;
    const reviewComponent = (avgReviewScore / 5) * 100 * 0.4;

    const avgMu =
      user.skillRatings.length > 0
        ? user.skillRatings.reduce((s, r) => s + r.mu, 0) /
          user.skillRatings.length
        : 25;
    const trueSkillComponent = Math.min(100, (avgMu / 50) * 100) * 0.3;

    const threadPosts = await ctx.db
      .query("exchangeThreadPosts")
      .withIndex("by_authorId", (q) => q.eq("authorId", user._id))
      .collect();
    const feedbackComponent = Math.min(100, threadPosts.length * 10) * 0.3;

    const communityScore = Math.round(
      reviewComponent + trueSkillComponent + feedbackComponent
    );

    // ========== 维度三：NFT 成就评分 (0~100) ==========
    const nftCount = user.nftSkills.length;
    const nftCountComponent = Math.min(100, nftCount * 20) * 0.3;

    const totalSwaps = user.nftSkills.reduce((s, n) => s + n.swapCount, 0);
    const swapComponent = Math.min(100, totalSwaps * 5) * 0.4;

    const milestonesA = await ctx.db
      .query("milestones")
      .withIndex("by_userIdA", (q) => q.eq("userIdA", user._id))
      .collect();
    const milestonesB = await ctx.db
      .query("milestones")
      .withIndex("by_userIdB", (q) => q.eq("userIdB", user._id))
      .collect();
    const totalBadges = [...milestonesA, ...milestonesB].reduce(
      (s, m) => s + m.unlockedBadges.length,
      0
    );
    const badgeComponent = Math.min(100, totalBadges * 10) * 0.3;

    const achievementScore = Math.round(
      nftCountComponent + swapComponent + badgeComponent
    );

    // ========== 综合评分 ==========
    const progressiveRating = Math.round(
      socialScore * 0.3 + communityScore * 0.5 + achievementScore * 0.2
    );

    await ctx.db.patch(user._id, {
      socialScore,
      communityScore,
      progressiveRating,
      trustScore: progressiveRating,
    });

    return {
      socialScore,
      communityScore,
      achievementScore,
      progressiveRating,
      breakdown: {
        social: {
          weight: "30%",
          score: socialScore,
          detail: `${validAnalyses.length} 个平台分析`,
        },
        community: {
          weight: "50%",
          score: communityScore,
          detail: `${reviews.length} 条评价，均分 ${avgReviewScore.toFixed(1)}，TrueSkill μ=${avgMu.toFixed(1)}，${threadPosts.length} 条反馈帖`,
        },
        achievement: {
          weight: "20%",
          score: achievementScore,
          detail: `${nftCount} 个 NFT，${totalSwaps} 次交换，${totalBadges} 枚勋章`,
        },
      },
    };
  },
});

/**
 * 获取用户的渐进式评分详情
 */
export const getScore = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const user = args.userId
      ? await ctx.db.get(args.userId)
      : await requireAuth(ctx);
    if (!user) return null;

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const socialAnalyses = await ctx.db
      .query("socialMediaAnalysis")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const validAnalyses = socialAnalyses.filter((a) => a.expiresAt > Date.now());

    const nftStories = await ctx.db
      .query("nftStories")
      .withIndex("by_providerId", (q) => q.eq("providerId", user._id))
      .collect();

    return {
      progressiveRating: user.progressiveRating ?? 0,
      socialScore: user.socialScore ?? 0,
      communityScore: user.communityScore ?? 0,
      trustScore: user.trustScore ?? 0,
      stats: {
        reviewCount: reviews.length,
        avgReviewScore:
          reviews.length > 0
            ? Number(
                (
                  reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
                ).toFixed(1)
              )
            : 0,
        socialPlatforms: validAnalyses.length,
        nftCount: user.nftSkills.length,
        storyNftCount: nftStories.length,
        totalSwaps: user.nftSkills.reduce((s, n) => s + n.swapCount, 0),
      },
    };
  },
});

/**
 * 获取平台排行榜（按渐进式评分排序）
 */
export const getLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();

    const ranked = users
      .filter((u) => u.onboardingCompleted)
      .map((u) => ({
        _id: u._id,
        name: u.name,
        avatar: u.avatar,
        title: u.title,
        progressiveRating: u.progressiveRating ?? 0,
        socialScore: u.socialScore ?? 0,
        communityScore: u.communityScore ?? 0,
        nftCount: u.nftSkills.length,
        skillTags: u.skillTags,
      }))
      .sort((a, b) => b.progressiveRating - a.progressiveRating)
      .slice(0, args.limit ?? 20);

    return ranked;
  },
});
