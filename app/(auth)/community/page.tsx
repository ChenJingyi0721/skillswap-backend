"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Heart, MessageCircle, Send, TrendingUp } from "lucide-react";

export default function CommunityPage() {
  const [newPost, setNewPost] = useState("");
  const posts = useQuery(api.posts.list);
  const updates = useQuery(api.posts.listCommunityUpdates);
  const threads = useQuery(api.exchangeThreads.listPublicThreads);
  const createPost = useMutation(api.posts.create);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    await createPost({ content: newPost.trim(), type: "general" });
    setNewPost("");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">社区</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* New post */}
          <div className="card">
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="分享你的技能交换经历..."
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-primary-500"
            />
            <div className="mt-2 flex justify-end">
              <button onClick={handlePost} disabled={!newPost.trim()} className="btn-primary">
                <Send className="mr-2 h-4 w-4" />
                发布
              </button>
            </div>
          </div>

          {/* Exchange threads */}
          {threads && threads.length > 0 && (
            <div className="card border-primary-100 bg-primary-50/30">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-primary-700">
                <TrendingUp className="h-4 w-4" />
                热门交换反馈帖
              </h2>
              <div className="space-y-2">
                {threads.slice(0, 3).map((t) => (
                  <div key={t._id} className="rounded-lg bg-white p-3 text-sm">
                    <p className="font-medium text-gray-900">{t.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {t.requesterName} × {t.providerName} · {t.postCount} 条互动
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts */}
          {posts === undefined ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : posts.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              还没有帖子，来发第一条吧
            </div>
          ) : (
            posts.map((post) => (
              <div key={post._id} className="card">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-medium">
                    {post.authorAvatar ? (
                      <img src={post.authorAvatar} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      post.authorName.charAt(0)
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{post.authorName}</p>
                    <p className="text-xs text-gray-500">{post.type ?? "帖子"}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-700">{post.content}</p>
                {post.tags && post.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {post.tags.map((tag) => (
                      <span key={tag} className="badge bg-gray-100 text-gray-600">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Heart className="h-4 w-4" /> {post.likes ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" /> {post.comments ?? 0}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar: Community updates */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="mb-3 font-semibold">社区动态</h2>
            {updates === undefined ? (
              <p className="text-sm text-gray-400">加载中...</p>
            ) : updates.length === 0 ? (
              <p className="text-sm text-gray-400">暂无动态</p>
            ) : (
              <div className="space-y-3">
                {updates.map((u) => (
                  <div key={u._id} className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs">
                      {u.userAvatar ? (
                        <img src={u.userAvatar} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        u.userName.charAt(0)
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      <span className="font-medium text-gray-900">{u.userName}</span>{" "}
                      {u.action}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
