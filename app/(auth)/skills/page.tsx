"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Search, Filter, Star, Shield } from "lucide-react";

const categories = ["全部", "编程", "语言", "音乐", "设计", "商业"];

export default function SkillsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("全部");

  const skills = useQuery(api.skills.list, {
    category: category === "全部" ? undefined : category,
    search: search || undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">发现技能</h1>
        <p className="text-gray-500">浏览可交换的技能，找到你的学习伙伴</p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索技能..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                category === c
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Skills Grid */}
      {skills === undefined ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : skills.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <Filter className="mx-auto mb-3 h-10 w-10" />
          <p>没有找到相关技能</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <div key={skill._id} className="card transition hover:shadow-md">
              {skill.image && (
                <div className="mb-4 h-40 overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={skill.image}
                    alt={skill.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{skill.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {skill.user} · {skill.level === "beginner" ? "入门" : skill.level === "intermediate" ? "中级" : "高级"}
                  </p>
                </div>
                {skill.nftTokenId && (
                  <span className="badge bg-purple-100 text-purple-700">
                    <Shield className="mr-1 h-3 w-3" /> NFT
                  </span>
                )}
              </div>

              {skill.description && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                  {skill.description}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1 text-sm text-yellow-600">
                  <Star className="h-4 w-4 fill-yellow-400" />
                  {skill.rating?.toFixed(1) ?? "N/A"}
                </div>
                {skill.price && (
                  <span className="text-sm font-medium text-primary-600">
                    {skill.price}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {skill.speaks?.map((lang) => (
                  <span
                    key={lang}
                    className="badge bg-gray-100 text-gray-600"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
