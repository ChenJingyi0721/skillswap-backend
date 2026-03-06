import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAuth } from "../auth";

/**
 * Recommendation Agent — 个性化技能推荐
 * 基于用户历史交换记录 + 技能标签相似度推荐 "你可能想交换的技能"
 */
export const getRecommendations = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    // 1. 读取用户历史完成的交换记录，提取技能标签
    const completedSwaps = await ctx.db
      .query("sessions")
      .withIndex("by_requesterId", (q) => q.eq("requesterId", user._id))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const swappedSkillIds = completedSwaps
      .map((s) => s.skillId)
      .filter((id): id is NonNullable<typeof id> => id !== undefined);

    const swappedSkills = await Promise.all(
      swappedSkillIds.map((id) => ctx.db.get(id))
    );

    const hotTags = [
      ...new Set(
        swappedSkills
          .filter((s): s is NonNullable<typeof s> => s !== null)
          .map((s) => s.skillTag)
      ),
    ];

    // 2. 无历史记录时使用用户已有技能标签或默认标签
    const targetTags =
      hotTags.length > 0
        ? hotTags
        : user.skillTags.length > 0
          ? user.skillTags
          : ["Python", "英语", "设计"];

    // 3. 从 KVS 查询高评分 / 高 NFT 的可用技能
    const allSkills = await Promise.all(
      targetTags.map((tag) =>
        ctx.db
          .query("skills")
          .withIndex("by_skillTag", (q) => q.eq("skillTag", tag))
          .filter((q) => q.eq(q.field("isAvailable"), true))
          .collect()
      )
    );

    const flatSkills = allSkills
      .flat()
      .filter((s) => s.userId !== user._id);

    // 4. 按"教学者评分 + NFT 交换次数"排序
    const enriched = await Promise.all(
      flatSkills.map(async (sk) => {
        const provider = await ctx.db.get(sk.userId);
        if (!provider) return null;

        const pRating = provider.skillRatings.find(
          (r) => r.skillTag === sk.skillTag
        );
        const pNft = provider.nftSkills.find(
          (n) => n.skillTag === sk.skillTag
        );

        return {
          _id: sk._id,
          title: sk.title,
          skillTag: sk.skillTag,
          level: sk.level,
          description: sk.description,
          image: sk.image,
          providerId: provider._id,
          providerName: provider.name,
          providerAvatar: provider.avatar,
          providerRating: pRating ? Number(pRating.mu.toFixed(1)) : 25.0,
          nftSwapCount: pNft?.swapCount ?? 0,
          nftProof: pNft?.tokenId ?? "",
          score: (pRating?.mu ?? 25) + (pNft?.swapCount ?? 0) * 2,
        };
      })
    );

    const validResults = enriched
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.score - a.score);

    // 去重：同一技能只保留评分最高的
    const seen = new Set<string>();
    const deduplicated = validResults.filter((r) => {
      const key = `${r.skillTag}_${r.providerId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduplicated.slice(0, 6);
  },
});
