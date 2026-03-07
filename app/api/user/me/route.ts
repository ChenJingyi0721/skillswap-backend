import { NextRequest } from "next/server";
import { getConvexClient } from "@/lib/convex-server";
import { handleCors, jsonResponse } from "@/lib/cors";
import { api } from "@/convex/_generated/api";

export async function OPTIONS(request: NextRequest) {
  return handleCors(request)!;
}

export async function GET(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const convex = getConvexClient();
    const user = await convex.query(api.users.me);

    if (!user) {
      return jsonResponse({
        id: "guest",
        name: "Guest User",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=guest",
        title: "SkillSwap Member",
        location: "",
        level: 1,
        trustScore: 50,
        credits: 100,
        bio: "",
        isPro: false,
        tags: [],
      }, request);
    }

    return jsonResponse({
      id: user._id,
      name: user.name,
      avatar: user.avatar ?? "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
      title: user.title ?? "SkillSwap Member",
      location: user.location ?? "",
      level: user.level === "advanced" ? 3 : user.level === "intermediate" ? 2 : 1,
      trustScore: user.progressiveRating ?? user.trustScore ?? 50,
      credits: user.credits ?? 100,
      bio: user.bio ?? "",
      isPro: user.isPro ?? false,
      tags: user.tags ?? user.skillTags ?? [],
    }, request);
  } catch (error) {
    return jsonResponse({ error: "Failed to fetch user" }, request, 500);
  }
}
