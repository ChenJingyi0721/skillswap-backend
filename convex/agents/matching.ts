import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuth } from "../auth";
import { Id } from "../_generated/dataModel";

/**
 * TrueSkill 匹配度计算
 * 基于两个用户在同一技能上的 mu/sigma 值计算匹配度（0~1）
 * mu 越接近 → 匹配度越高（水平相当更适合互学）
 * sigma 越小 → 评分越可靠
 */
function calculateMatchScore(
  mu1: number,
  sigma1: number,
  mu2: number,
  sigma2: number
): number {
  const muDiff = Math.abs(mu1 - mu2);
  const avgMu = (mu1 + mu2) / 2;
  const reliability = 1 / (1 + (sigma1 + sigma2) / 10);
  const proximity = 1 - muDiff / (avgMu + 1);
  return Math.max(0.1, Math.min(1, proximity * 0.7 + reliability * 0.3));
}

/**
 * Matching Agent — AI 智能匹配
 * TrueSkill 评分占 70% + NFT 交换次数权重占 30%
 */
export const findMatches = mutation({
  args: {
    skillTag: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const cachedResult = await ctx.db
      .query("matchCache")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (cachedResult && cachedResult.expiresAt > Date.now()) {
      const relevantMatches = cachedResult.matches.filter(
        (m) => m.skillTag === args.skillTag
      );
      if (relevantMatches.length > 0) return relevantMatches;
    }

    const currentRating = user.skillRatings.find(
      (r) => r.skillTag === args.skillTag
    );
    if (!currentRating) {
      throw new Error(`未设置 ${args.skillTag} 的技能评分，请先完成 Onboarding`);
    }

    const candidateSkills = await ctx.db
      .query("skills")
      .withIndex("by_skillTag", (q) => q.eq("skillTag", args.skillTag))
      .filter((q) => q.eq(q.field("isAvailable"), true))
      .collect();

    const candidateUserIds = [
      ...new Set(
        candidateSkills
          .map((s) => s.userId)
          .filter((id) => id !== user._id)
      ),
    ];

    const matchList = await Promise.all(
      candidateUserIds.map(async (candidateId) => {
        const candidate = await ctx.db.get(candidateId);
        if (!candidate) return null;

        const cRating = candidate.skillRatings.find(
          (r) => r.skillTag === args.skillTag
        );
        if (!cRating) return null;

        const tsScore =
          calculateMatchScore(
            currentRating.mu,
            currentRating.sigma,
            cRating.mu,
            cRating.sigma
          ) * 0.7;

        const cNft = candidate.nftSkills.find(
          (n) => n.skillTag === args.skillTag
        );
        const nftWeight = cNft ? Math.min(0.3, cNft.swapCount / 10) : 0;
        const matchScore = Number((tsScore + nftWeight).toFixed(2));

        return {
          targetId: candidateId,
          targetName: candidate.name,
          targetAvatar: candidate.avatar,
          skillTag: args.skillTag,
          matchScore,
          nftProof: cNft?.tokenId ?? "",
          trueskillMu: cRating.mu,
          nftSwapCount: cNft?.swapCount ?? 0,
        };
      })
    );

    const validMatches = matchList
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    const cacheData = validMatches.map((m) => ({
      targetId: m.targetId,
      skillTag: m.skillTag,
      matchScore: m.matchScore,
      nftProof: m.nftProof,
    }));

    if (cachedResult) {
      await ctx.db.patch(cachedResult._id, {
        matches: cacheData,
        expiresAt: Date.now() + 3600 * 1000,
      });
    } else {
      await ctx.db.insert("matchCache", {
        userId: user._id,
        matches: cacheData,
        expiresAt: Date.now() + 3600 * 1000,
      });
    }

    return validMatches;
  },
});

/**
 * 查询缓存的匹配结果（只读，供前端实时订阅）
 */
export const getCachedMatches = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    const cached = await ctx.db
      .query("matchCache")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!cached || cached.expiresAt < Date.now()) return [];
    return cached.matches;
  },
});
