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

/**
 * 铸造交换见证 NFT — AI 生成故事 + 贡献度分配
 * 交换完成并双方互评后自动触发
 */
export const mintStoryNft = mutation({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("会话不存在");
    if (session.status !== "completed") throw new Error("会话未完成");

    const existing = await ctx.db
      .query("nftStories")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (existing) {
      return { success: true, tokenId: existing.tokenId, message: "已存在" };
    }

    const requester = await ctx.db.get(session.requesterId);
    const provider = await ctx.db.get(session.providerId);
    if (!requester || !provider) throw new Error("用户不存在");

    // AI 分配贡献度：基于评分和反馈帖互动
    const thread = await ctx.db
      .query("exchangeThreads")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    let providerContribution = 50;
    let requesterContribution = 50;

    if (thread) {
      const posts = await ctx.db
        .query("exchangeThreadPosts")
        .withIndex("by_threadId", (q) => q.eq("threadId", thread._id))
        .collect();

      const providerPosts = posts.filter((p) => p.authorId === session.providerId).length;
      const requesterPosts = posts.filter((p) => p.authorId === session.requesterId).length;
      const totalPosts = providerPosts + requesterPosts;

      if (totalPosts > 0) {
        providerContribution = Math.round((providerPosts / totalPosts) * 60 + 20);
        requesterContribution = 100 - providerContribution;
      }
    }

    // 基于互评分数微调
    if (session.requesterScore !== undefined && session.providerScore !== undefined) {
      const avgRequesterView = session.requesterScore;
      const avgProviderView = session.providerScore;
      const scoreBias = (avgRequesterView - avgProviderView) * 3;
      providerContribution = Math.min(80, Math.max(20, providerContribution + scoreBias));
      requesterContribution = 100 - providerContribution;
    }

    const tokenId = `story_${args.sessionId}_${Date.now()}`;

    const storyHighlights = [
      `${provider.name} 教授了「${session.title}」技能`,
      `${requester.name} 积极参与学习并给出反馈`,
      thread ? `双方在反馈帖中共发布了 ${thread.postCount} 条互动` : "双方完成了技能交换",
    ];

    const metadata = {
      name: `${session.title} 交换见证`,
      participants: [provider.name, requester.name],
      skillTag: session.title,
      contribution: { provider: providerContribution, requester: requesterContribution },
      highlights: storyHighlights,
      platform: "SkillSwap",
      createdAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
    const storageId = await ctx.storage.store(blob);
    const metadataUri = (await ctx.storage.getUrl(storageId)) ?? String(storageId);

    await ctx.db.insert("nftStories", {
      tokenId,
      sessionId: args.sessionId,
      skillTag: session.title,
      providerId: session.providerId,
      requesterId: session.requesterId,
      providerContribution,
      requesterContribution,
      storyTitle: `${provider.name} × ${requester.name}：${session.title}`,
      storySummary: `一次精彩的技能交换。${provider.name} 贡献了 ${providerContribution}%，${requester.name} 贡献了 ${requesterContribution}%。`,
      storyHighlights,
      threadId: thread?._id,
      metadataUri: String(metadataUri),
      isPublic: true,
      viewCount: 0,
    });

    await ctx.db.insert("communityUpdates", {
      userId: user._id,
      userName: user.name,
      userAvatar: user.avatar,
      action: `生成了「${session.title}」交换见证 NFT`,
      type: "nft_story",
    });

    return { success: true, tokenId, metadataUri: String(metadataUri) };
  },
});

/**
 * NFT 橱窗：获取用户的所有故事型 NFT
 */
export const getShowcase = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const targetId = args.userId ?? (await requireAuth(ctx))._id;

    const asProvider = await ctx.db
      .query("nftStories")
      .withIndex("by_providerId", (q) => q.eq("providerId", targetId))
      .collect();

    const asRequester = await ctx.db
      .query("nftStories")
      .withIndex("by_requesterId", (q) => q.eq("requesterId", targetId))
      .collect();

    const all = [...asProvider, ...asRequester].filter((n) => n.isPublic);

    const enriched = await Promise.all(
      all.map(async (nft) => {
        const provider = await ctx.db.get(nft.providerId);
        const requester = await ctx.db.get(nft.requesterId);
        return {
          ...nft,
          providerName: provider?.name ?? "未知",
          providerAvatar: provider?.avatar,
          requesterName: requester?.name ?? "未知",
          requesterAvatar: requester?.avatar,
        };
      })
    );

    return enriched.sort(
      (a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0)
    );
  },
});

/**
 * 查看 NFT 故事详情（增加浏览计数）
 */
export const viewStory = mutation({
  args: { tokenId: v.string() },
  handler: async (ctx, args) => {
    const story = await ctx.db
      .query("nftStories")
      .withIndex("by_tokenId", (q) => q.eq("tokenId", args.tokenId))
      .unique();

    if (!story) return null;

    await ctx.db.patch(story._id, { viewCount: story.viewCount + 1 });

    const provider = await ctx.db.get(story.providerId);
    const requester = await ctx.db.get(story.requesterId);

    return {
      ...story,
      viewCount: story.viewCount + 1,
      providerName: provider?.name,
      providerAvatar: provider?.avatar,
      requesterName: requester?.name,
      requesterAvatar: requester?.avatar,
    };
  },
});
