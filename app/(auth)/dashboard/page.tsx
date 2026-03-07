"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Calendar,
  Award,
  Sparkles,
  ArrowRight,
  Star,
} from "lucide-react";

export default function DashboardPage() {
  const { user: clerkUser } = useUser();
  const user = useQuery(api.users.me);
  const syncUser = useMutation(api.users.syncUser);
  const sessions = useQuery(api.sessions.list, { dashboard: true });
  const score = useQuery(api.progressiveScoring.getScore);

  useEffect(() => {
    if (clerkUser && user === null) {
      syncUser();
    }
  }, [clerkUser, user, syncUser]);

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const learning = Array.isArray(sessions) ? [] : sessions?.learning ?? [];
  const teaching = Array.isArray(sessions) ? [] : sessions?.teaching ?? [];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            你好，{user.name} 👋
          </h1>
          <p className="text-gray-500">欢迎回到 SkillSwap</p>
        </div>
        <Link href="/ai-match" className="btn-primary">
          <Sparkles className="mr-2 h-4 w-4" />
          AI 配对
        </Link>
      </div>

      {/* Score Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">综合评分</p>
              <p className="text-2xl font-bold">
                {score?.progressiveRating ?? user.progressiveRating ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">社区评分</p>
              <p className="text-2xl font-bold">
                {score?.communityScore ?? user.communityScore ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">NFT 凭证</p>
              <p className="text-2xl font-bold">{user.nftSkills.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总交换</p>
              <p className="text-2xl font-bold">
                {score?.stats?.totalSwaps ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Learning */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">我在学习</h2>
            <Link href="/skills" className="text-sm text-primary-600 hover:underline">
              浏览更多 <ArrowRight className="inline h-3 w-3" />
            </Link>
          </div>
          {learning.length === 0 ? (
            <p className="py-8 text-center text-gray-400">
              还没有学习中的交换，去发现新技能吧
            </p>
          ) : (
            <div className="space-y-3">
              {learning.slice(0, 5).map((s: any) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{s.title}</p>
                    <p className="text-xs text-gray-500">
                      {s.partner} · {s.date} {s.time}
                    </p>
                  </div>
                  <span
                    className={`badge ${
                      s.status === "upcoming"
                        ? "bg-blue-100 text-blue-700"
                        : s.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {s.status === "upcoming"
                      ? "即将开始"
                      : s.status === "completed"
                        ? "已完成"
                        : "待确认"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Teaching */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">我在教授</h2>
          </div>
          {teaching.length === 0 ? (
            <p className="py-8 text-center text-gray-400">
              还没有教授中的交换
            </p>
          ) : (
            <div className="space-y-3">
              {teaching.slice(0, 5).map((s: any) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{s.title}</p>
                    <p className="text-xs text-gray-500">
                      {s.partner} · {s.date} {s.time}
                    </p>
                  </div>
                  <span
                    className={`badge ${
                      s.status === "upcoming"
                        ? "bg-blue-100 text-blue-700"
                        : s.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {s.status === "upcoming"
                      ? "即将开始"
                      : s.status === "completed"
                        ? "已完成"
                        : "待确认"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Skills */}
      {user.skillTags.length > 0 && (
        <div className="card">
          <h2 className="mb-3 text-lg font-semibold">我的技能</h2>
          <div className="flex flex-wrap gap-2">
            {user.skillTags.map((tag) => (
              <span key={tag} className="badge bg-primary-100 text-primary-700">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
