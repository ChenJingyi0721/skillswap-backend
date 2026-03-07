"use client";

import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Sparkles, Shield, Users, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI 智能配对",
    desc: "AI 分析你的技能水平和学习需求，精准匹配最佳交换伙伴",
  },
  {
    icon: Shield,
    title: "渐进式信任评分",
    desc: "社交媒体 AI 分析 + 社区互评 + NFT 成就，多维度评估技能可信度",
  },
  {
    icon: Users,
    title: "Soul 式社交",
    desc: "从初识到灵魂伙伴，互动越深成就越多，见证每段技能交换的故事",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-primary-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white font-bold">
            S
          </div>
          <span className="text-xl font-bold">SkillSwap</span>
        </div>
        <div className="flex items-center gap-3">
          <SignedIn>
            <Link href="/dashboard" className="btn-primary">
              进入平台 <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </SignedIn>
          <SignedOut>
            <Link href="/sign-in" className="btn-secondary">
              登录
            </Link>
            <Link href="/sign-up" className="btn-primary">
              免费注册
            </Link>
          </SignedOut>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
        <div className="badge mb-4 bg-primary-100 text-primary-700">
          AI 驱动的技能交换平台
        </div>
        <h1 className="text-4xl font-extrabold leading-tight text-gray-900 sm:text-5xl md:text-6xl">
          用你的技能
          <br />
          <span className="text-primary-600">交换</span>想学的一切
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          SkillSwap 通过 AI 智能匹配和 NFT 信任背书，让你找到最合适的技能交换伙伴。
          教别人你擅长的，学你一直想学的。
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <SignedOut>
            <Link href="/sign-up" className="btn-primary text-base px-6 py-3">
              开始交换 <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className="btn-primary text-base px-6 py-3">
              进入仪表盘 <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-500">
        © 2026 SkillSwap. Built with Convex + Clerk + Next.js
      </footer>
    </div>
  );
}
