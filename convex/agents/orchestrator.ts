import { v } from "convex/values";
import { action, mutation, query } from "../_generated/server";
import { requireAuth } from "../auth";
import { api, internal } from "../_generated/api";

/**
 * 中枢调度 Agent — 前端唯一入口
 * 解析用户意图，路由到对应子 Agent，统一处理返回结果
 *
 * 支持的 action:
 * - match: AI 智能匹配 → Matching Agent
 * - recommend: 技能推荐 → Recommendation Agent
 * - rating: 评分更新 → Rating Agent
 * - nft_mint: NFT 铸造 → NFT Agent
 */
export const handleUserAction = mutation({
  args: {
    action: v.union(
      v.literal("match"),
      v.literal("recommend"),
      v.literal("rating"),
      v.literal("nft_mint")
    ),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    switch (args.action) {
      case "match": {
        const { skillTag } = args.payload as { skillTag: string };
        if (!skillTag) throw new Error("缺少 skillTag 参数");

        const currentRating = user.skillRatings.find(
          (r) => r.skillTag === skillTag
        );
        if (!currentRating) {
          throw new Error(`未设置 ${skillTag} 的技能评分`);
        }

        const candidateSkills = await ctx.db
          .query("skills")
          .withIndex("by_skillTag", (q) => q.eq("skillTag", skillTag))
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
          candidateUserIds.map(async (cId) => {
            const c = await ctx.db.get(cId);
            if (!c) return null;
            const cRating = c.skillRatings.find(
              (r) => r.skillTag === skillTag
            );
            if (!cRating) return null;

            const muDiff = Math.abs(currentRating.mu - cRating.mu);
            const avgMu = (currentRating.mu + cRating.mu) / 2;
            const tsScore =
              (1 - muDiff / (avgMu + 1)) * 0.7;

            const cNft = c.nftSkills.find((n) => n.skillTag === skillTag);
            const nftWeight = cNft
              ? Math.min(0.3, cNft.swapCount / 10)
              : 0;

            return {
              targetId: cId,
              targetName: c.name,
              targetAvatar: c.avatar,
              skillTag,
              matchScore: Number((tsScore + nftWeight).toFixed(2)),
              nftProof: cNft?.tokenId ?? "",
            };
          })
        );

        return matchList
          .filter((m): m is NonNullable<typeof m> => m !== null)
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 5);
      }

      case "recommend": {
        const completedSwaps = await ctx.db
          .query("sessions")
          .withIndex("by_requesterId", (q) =>
            q.eq("requesterId", user._id)
          )
          .filter((q) => q.eq(q.field("status"), "completed"))
          .collect();

        const skillIds = completedSwaps
          .map((s) => s.skillId)
          .filter((id): id is NonNullable<typeof id> => id !== undefined);

        const swappedSkills = await Promise.all(
          skillIds.map((id) => ctx.db.get(id))
        );
        const hotTags = [
          ...new Set(
            swappedSkills
              .filter((s): s is NonNullable<typeof s> => s !== null)
              .map((s) => s.skillTag)
          ),
        ];

        const tags =
          hotTags.length > 0
            ? hotTags
            : user.skillTags.length > 0
              ? user.skillTags
              : ["Python", "英语", "设计"];

        const allSkills = await Promise.all(
          tags.map((tag) =>
            ctx.db
              .query("skills")
              .withIndex("by_skillTag", (q) => q.eq("skillTag", tag))
              .filter((q) => q.eq(q.field("isAvailable"), true))
              .collect()
          )
        );

        const flat = allSkills.flat().filter((s) => s.userId !== user._id);

        const enriched = await Promise.all(
          flat.map(async (sk) => {
            const p = await ctx.db.get(sk.userId);
            if (!p) return null;
            const pr = p.skillRatings.find(
              (r) => r.skillTag === sk.skillTag
            );
            const pn = p.nftSkills.find(
              (n) => n.skillTag === sk.skillTag
            );
            return {
              _id: sk._id,
              title: sk.title,
              skillTag: sk.skillTag,
              level: sk.level,
              providerName: p.name,
              providerAvatar: p.avatar,
              providerRating: pr ? Number(pr.mu.toFixed(1)) : 25.0,
              nftSwapCount: pn?.swapCount ?? 0,
            };
          })
        );

        return enriched
          .filter((r): r is NonNullable<typeof r> => r !== null)
          .sort(
            (a, b) =>
              b.providerRating +
              b.nftSwapCount * 2 -
              (a.providerRating + a.nftSwapCount * 2)
          )
          .slice(0, 6);
      }

      case "rating": {
        const { sessionId, score } = args.payload as {
          sessionId: string;
          score: number;
        };
        if (!sessionId || score === undefined) {
          throw new Error("缺少 sessionId 或 score 参数");
        }
        // 评分逻辑委托给 Rating Agent 的独立函数
        // 此处内联简化版以保持中枢的同步调用能力
        const session = await ctx.db.get(sessionId as any);
        if (!session) throw new Error("会话不存在");
        if (session.status !== "completed")
          throw new Error("会话未完成");

        const isReq = session.requesterId === user._id;
        const field = isReq ? "requesterScore" : "providerScore";
        await ctx.db.patch(session._id, { [field]: score });

        return { success: true, message: "评分已提交，双方均评分后将更新 TrueSkill" };
      }

      case "nft_mint": {
        const { skillTag, skillId } = args.payload as {
          skillTag: string;
          skillId?: string;
        };
        if (!skillTag) throw new Error("缺少 skillTag 参数");

        const existing = user.nftSkills.find(
          (n) => n.skillTag === skillTag
        );
        if (existing) {
          return {
            success: true,
            tokenId: existing.tokenId,
            message: "已有 NFT",
          };
        }

        const tokenId = `nft_${user._id}_${skillTag}_${Date.now()}`;
        const metadata = {
          name: `${user.name} - ${skillTag} Skill NFT`,
          skillTag,
          mu: user.skillRatings.find((r) => r.skillTag === skillTag)
            ?.mu ?? 25.0,
        };

        const blob = new Blob([JSON.stringify(metadata)], {
          type: "application/json",
        });
        const storageId = await ctx.storage.store(blob);
        const uri =
          (await ctx.storage.getUrl(storageId)) ?? String(storageId);

        await ctx.db.patch(user._id, {
          nftSkills: [
            ...user.nftSkills,
            {
              tokenId,
              skillTag,
              swapCount: 0,
              metadataUri: uri,
            },
          ],
        });

        if (skillId) {
          await ctx.db.patch(skillId as any, { nftTokenId: tokenId });
        }

        return { success: true, tokenId, metadataUri: uri };
      }

      default:
        throw new Error("无效操作类型");
    }
  },
});
