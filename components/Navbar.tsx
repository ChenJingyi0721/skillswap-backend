"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Home,
  Search,
  MessageSquare,
  Users,
  User,
  Sparkles,
  LayoutDashboard,
} from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { href: "/skills", label: "技能", icon: Search },
  { href: "/ai-match", label: "AI 配对", icon: Sparkles },
  { href: "/messages", label: "消息", icon: MessageSquare },
  { href: "/community", label: "社区", icon: Users },
  { href: "/profile", label: "我的", icon: User },
];

export default function Navbar() {
  const pathname = usePathname();
  const user = useQuery(api.users.me);

  return (
    <>
      {/* Desktop top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 hidden border-b border-gray-200 bg-white/80 backdrop-blur-md md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white font-bold text-sm">
              S
            </div>
            <span className="text-lg font-bold text-gray-900">SkillSwap</span>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <SignedIn>
              {user && (
                <span className="text-sm text-gray-500">
                  {user.progressiveRating ?? user.trustScore ?? 0} 分
                </span>
              )}
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <Link href="/sign-in" className="btn-primary">
                登录
              </Link>
            </SignedOut>
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white md:hidden">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition",
                  isActive ? "text-primary-600" : "text-gray-400"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
