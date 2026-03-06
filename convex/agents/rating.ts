import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth } from "../auth";

/**
 * TrueSkill 评分更新算法
 * score >= 4 → 正向更新（mu 增加，sigma 收敛表示评分更可靠）
 * score < 4  → 负向更新（mu 降低，sigma 发散表示评分不确定性增大）
 */
function updateTrueSkill(
  mu: number,
  sigma: number,
  score: number
): { mu: number; sigma: number } {
  const k = sigma / 25;
  const adjustment = (score - 3) * k * 2;
  const newMu = Number(Math.max(0, mu + adjustment).toFixed(2));
  const newSigma = Number(
    (score >= 4 ? sigma * 0.95 : Math.min(sigma * 1.05, 10)).toFixed(2)
  );
  return { mu: newMu, sigma: newSigma };
}

/**
 * Rating Agent — 交换完成后评分 + TrueSkill 更新
 */
export const updateSkillRating = mutation({
  args: {
    sessionId: v.id("sessions"),
    score: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    if (args.score < 1 || args.score > 5) {
      throw new Error("评分必须在 1-5 之间");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("会话不存在");
    if (session.status !== "completed") throw new Error("会话未完成，无法评分");

    const isRequester = session.requesterId === user._id;
    const isProvider = session.providerId === user._id;
    if (!isRequester && !isProvider) throw new Error("无权评分此会话");

    const scoreField = isRequester ? "requesterScore" : "providerScore";
    const existingScore = isRequester
      ? session.requesterScore
      : session.providerScore;
    if (existingScore !== undefined) throw new Error("已评过分");

    await ctx.db.patch(args.sessionId, { [scoreField]: args.score });

    const targetUserId = isRequester
      ? session.providerId
      : session.requesterId;
    const targetUser = await ctx.db.get(targetUserId);
    if (!targetUser) throw new Error("对方用户不存在");

    // 创建评价记录
    await ctx.db.insert("reviews", {
      userId: targetUserId,
      reviewerId: user._id,
      reviewerName: user.name,
      reviewerAvatar: user.avatar,
      rating: args.score,
      comment: args.score >= 4 ? "很棒的交换体验！" : "还有提升空间",
      skillTag: session.title,
      sessionId: args.sessionId,
    });

    // 若双方均已评分，触发 TrueSkill 更新
    const updatedSession = await ctx.db.get(args.sessionId);
    if (
      updatedSession &&
      updatedSession.requesterScore !== undefined &&
      updatedSession.providerScore !== undefined
    ) {
      const requester = await ctx.db.get(updatedSession.requesterId);
      const provider = await ctx.db.get(updatedSession.providerId);
      if (!requester || !provider) return { success: true };

      const skillTag = session.title;
      const ratingUpdates: Array<{
        userId: typeof requester._id;
        skillTag: string;
        oldMu: number;
        newMu: number;
      }> = [];

      // 更新求学者 TrueSkill
      const rOldRating = requester.skillRatings.find(
        (r) => r.skillTag === skillTag
      );
      if (rOldRating) {
        const rNew = updateTrueSkill(
          rOldRating.mu,
          rOldRating.sigma,
          updatedSession.providerScore
        );
        const newRatings = requester.skillRatings.map((r) =>
          r.skillTag === skillTag
            ? { skillTag, mu: rNew.mu, sigma: rNew.sigma }
            : r
        );
        await ctx.db.patch(requester._id, { skillRatings: newRatings });
        ratingUpdates.push({
          userId: requester._id,
          skillTag,
          oldMu: rOldRating.mu,
          newMu: rNew.mu,
        });
      }

      // 更新教学者 TrueSkill
      const pOldRating = provider.skillRatings.find(
        (r) => r.skillTag === skillTag
      );
      if (pOldRating) {
        const pNew = updateTrueSkill(
          pOldRating.mu,
          pOldRating.sigma,
          updatedSession.requesterScore
        );
        const newRatings = provider.skillRatings.map((r) =>
          r.skillTag === skillTag
            ? { skillTag, mu: pNew.mu, sigma: pNew.sigma }
            : r
        );
        await ctx.db.patch(provider._id, { skillRatings: newRatings });
        ratingUpdates.push({
          userId: provider._id,
          skillTag,
          oldMu: pOldRating.mu,
          newMu: pNew.mu,
        });
      }

      // 更新教学者 NFT 交换次数
      const pNft = provider.nftSkills.find((n) => n.skillTag === skillTag);
      if (pNft) {
        const newNftSkills = provider.nftSkills.map((n) =>
          n.tokenId === pNft.tokenId
            ? { ...n, swapCount: n.swapCount + 1 }
            : n
        );
        await ctx.db.patch(provider._id, { nftSkills: newNftSkills });
      }

      // 记录评分变更到会话
      await ctx.db.patch(args.sessionId, {
        ratingUpdate: ratingUpdates,
        rated: true,
      });

      // 写入社区动态
      await ctx.db.insert("communityUpdates", {
        userId: user._id,
        userName: user.name,
        userAvatar: user.avatar,
        action: `完成了 ${skillTag} 技能交换并互评`,
        type: "rating",
      });
    }

    return { success: true, message: "评分提交成功" };
  },
});
