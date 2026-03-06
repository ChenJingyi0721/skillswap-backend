import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuth } from "../auth";

/**
 * NFT Agent — 技能发布时自动生成 NFT 凭证
 * 元数据存储在 Convex Storage，链上仅存哈希和 tokenId
 *
 * Demo 版本：跳过链上 mint，直接在 Convex 内模拟 NFT 生成
 * 生产版本：集成 Thirdweb SDK 调用 Polygon mint
 */
export const mintSkillNft = mutation({
  args: {
    skillTag: v.string(),
    skillId: v.optional(v.id("skills")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const existingNft = user.nftSkills.find(
      (n) => n.skillTag === args.skillTag
    );
    if (existingNft) {
      return {
        success: true,
        tokenId: existingNft.tokenId,
        message: "该技能已有 NFT 凭证",
      };
    }

    const skillRating = user.skillRatings.find(
      (r) => r.skillTag === args.skillTag
    );

    // NFT 元数据（存储在 Convex）
    const nftMetadata = {
      name: `${user.name} - ${args.skillTag} Skill NFT`,
      description: `SkillSwap 区块链验证技能凭证。初始 TrueSkill 评分：${skillRating?.mu ?? 25.0}`,
      attributes: [
        { trait_type: "技能", value: args.skillTag },
        { trait_type: "初始评分", value: String(skillRating?.mu ?? 25.0) },
        { trait_type: "创建者", value: user.name },
        { trait_type: "平台", value: "SkillSwap" },
      ],
      createdAt: new Date().toISOString(),
    };

    // 存储元数据到 Convex Storage
    const metadataBlob = new Blob([JSON.stringify(nftMetadata)], {
      type: "application/json",
    });
    const storageId = await ctx.storage.store(metadataBlob);
    const metadataUri = (await ctx.storage.getUrl(storageId)) ?? storageId;

    // Demo 模式：生成模拟 tokenId
    // 生产模式：此处调用 ThirdwebSDK.fromPrivateKey() → contract.erc721.mint()
    const tokenId = `nft_${user._id}_${args.skillTag}_${Date.now()}`;

    // 更新用户 NFT 列表
    const newNftSkills = [
      ...user.nftSkills,
      {
        tokenId,
        skillTag: args.skillTag,
        swapCount: 0,
        metadataUri: String(metadataUri),
      },
    ];
    await ctx.db.patch(user._id, { nftSkills: newNftSkills });

    // 关联到技能记录
    if (args.skillId) {
      await ctx.db.patch(args.skillId, { nftTokenId: tokenId });
    }

    // 写入社区动态
    await ctx.db.insert("communityUpdates", {
      userId: user._id,
      userName: user.name,
      userAvatar: user.avatar,
      action: `为 ${args.skillTag} 技能生成了 NFT 凭证`,
      type: "nft",
    });

    return {
      success: true,
      tokenId,
      metadataUri: String(metadataUri),
      metadata: nftMetadata,
    };
  },
});

/**
 * 查询用户的 NFT 凭证列表
 */
export const getUserNfts = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let targetUser;

    if (args.userId) {
      targetUser = await ctx.db.get(args.userId);
    } else {
      targetUser = await requireAuth(ctx);
    }

    if (!targetUser) return [];

    return targetUser.nftSkills.map((nft) => ({
      ...nft,
      ownerName: targetUser.name,
      ownerAvatar: targetUser.avatar,
    }));
  },
});

/**
 * 验证 NFT 凭证的真实性（前端展示"信任背书"标签时调用）
 */
export const verifyNft = query({
  args: {
    tokenId: v.string(),
  },
  handler: async (ctx, args) => {
    const allUsers = await ctx.db.query("users").collect();

    for (const user of allUsers) {
      const nft = user.nftSkills.find((n) => n.tokenId === args.tokenId);
      if (nft) {
        return {
          valid: true,
          owner: user.name,
          skillTag: nft.skillTag,
          swapCount: nft.swapCount,
          metadataUri: nft.metadataUri,
        };
      }
    }

    return { valid: false };
  },
});
