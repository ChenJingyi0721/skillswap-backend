"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Award,
  TrendingUp,
  Star,
  Shield,
  Globe,
  Trophy,
  Eye,
} from "lucide-react";

export default function ProfilePage() {
  const user = useQuery(api.users.me);
  const score = useQuery(api.progressiveScoring.getScore);
  const badges = useQuery(api.milestones.getMyBadges);
  const showcase = useQuery(api.agents.nft.getShowcase);
  const socialAccounts = useQuery(api.socialMedia.getLinkedAccounts);
  const reviews = useQuery(api.posts.listReviews);

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-accent-500 text-2xl font-bold text-white">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              user.name.charAt(0)
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
            {user.title && <p className="text-sm text-gray-500">{user.title}</p>}
            {user.bio && <p className="mt-2 text-sm text-gray-600">{user.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {user.skillTags.map((tag) => (
                <span key={tag} className="badge bg-primary-100 text-primary-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Progressive Score */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card text-center">
          <TrendingUp className="mx-auto mb-2 h-6 w-6 text-primary-600" />
          <p className="text-3xl font-bold text-primary-600">
            {score?.progressiveRating ?? 0}
          </p>
          <p className="text-sm text-gray-500">综合评分</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${score?.progressiveRating ?? 0}%` }}
            />
          </div>
        </div>
        <div className="card text-center">
          <Globe className="mx-auto mb-2 h-6 w-6 text-green-600" />
          <p className="text-3xl font-bold text-green-600">
            {score?.socialScore ?? 0}
          </p>
          <p className="text-sm text-gray-500">社交媒体评分</p>
          <p className="mt-1 text-xs text-gray-400">
            {score?.stats?.socialPlatforms ?? 0} 个平台已分析
          </p>
        </div>
        <div className="card text-center">
          <Star className="mx-auto mb-2 h-6 w-6 text-yellow-500" />
          <p className="text-3xl font-bold text-yellow-600">
            {score?.communityScore ?? 0}
          </p>
          <p className="text-sm text-gray-500">社区评分</p>
          <p className="mt-1 text-xs text-gray-400">
            {score?.stats?.reviewCount ?? 0} 条评价 · 均分{" "}
            {score?.stats?.avgReviewScore ?? 0}
          </p>
        </div>
      </div>

      {/* Social Media Accounts */}
      <div className="card">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Globe className="h-5 w-5" />
          社交媒体账号
        </h2>
        {!socialAccounts || socialAccounts.length === 0 ? (
          <p className="text-sm text-gray-400">
            还未绑定社交媒体账号。绑定后 AI 将分析你的公开内容提升信任评分。
          </p>
        ) : (
          <div className="space-y-2">
            {socialAccounts.map((a) => (
              <div key={a._id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {a.platform === "bilibili" ? "📺" : a.platform === "xiaohongshu" ? "📕" : a.platform === "youtube" ? "▶️" : "📱"}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{a.platformUsername}</p>
                    <p className="text-xs text-gray-500">{a.platform}</p>
                  </div>
                </div>
                {a.isVerified && (
                  <span className="badge bg-green-100 text-green-700">已验证</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="card">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Trophy className="h-5 w-5" />
          成就勋章
        </h2>
        {!badges || badges.length === 0 ? (
          <p className="text-sm text-gray-400">
            还没有获得成就，与伙伴互动即可解锁
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {badges.map((b, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-3 text-center">
                <span className="text-3xl">{b.icon}</span>
                <p className="mt-1 text-sm font-medium text-gray-900">{b.name}</p>
                <p className="text-xs text-gray-500">与 {b.partnerName}</p>
                <p className="text-xs text-gray-400">{b.skillTag}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NFT Showcase */}
      <div className="card">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Shield className="h-5 w-5" />
          NFT 橱窗
        </h2>
        {!showcase || showcase.length === 0 ? (
          <div className="text-sm text-gray-400">
            <p>还没有交换见证 NFT</p>
            <p className="mt-1">完成技能交换后将自动生成带有贡献度分配的 NFT</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {showcase.map((nft) => (
              <div
                key={nft._id}
                className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    {nft.storyTitle}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Eye className="h-3 w-3" />
                    {nft.viewCount}
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600">{nft.storySummary}</p>
                <div className="mt-3 flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-purple-600">
                      {nft.providerName}
                    </span>
                    <span className="text-gray-400">
                      {nft.providerContribution}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-blue-600">
                      {nft.requesterName}
                    </span>
                    <span className="text-gray-400">
                      {nft.requesterContribution}%
                    </span>
                  </div>
                </div>
                {nft.storyHighlights.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {nft.storyHighlights.map((h, i) => (
                      <li key={i} className="text-xs text-gray-500">
                        • {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="card">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Star className="h-5 w-5" />
          收到的评价
        </h2>
        {!reviews || reviews.length === 0 ? (
          <p className="text-sm text-gray-400">还没有收到评价</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r._id} className="rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs">
                    {r.reviewerAvatar ? (
                      <img src={r.reviewerAvatar} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      r.reviewerName.charAt(0)
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{r.reviewerName}</p>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < r.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600">{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
