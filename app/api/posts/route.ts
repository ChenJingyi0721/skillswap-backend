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
    const posts = await convex.query(api.posts.list);

    const formatted = (posts ?? []).map((p: any, idx: number) => ({
      id: idx + 1,
      title: p.title ?? null,
      content: p.content ?? null,
      user: p.authorName ?? p.user ?? "Anonymous",
      avatar: p.authorAvatar ?? p.avatar ?? "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
      image: p.image ?? null,
      likes: p.likes ?? 0,
      comments: p.comments ?? 0,
      tag: p.tag ?? p.category ?? "",
      time: p.time ?? null,
    }));

    return jsonResponse(formatted, request);
  } catch (error) {
    return jsonResponse([], request);
  }
}
