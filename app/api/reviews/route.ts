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
    const reviews = await convex.query(api.posts.listReviews);

    const formatted = (reviews ?? []).map((r: any, idx: number) => ({
      id: idx + 1,
      user: r.reviewerName ?? "Anonymous",
      avatar: r.reviewerAvatar ?? "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
      rating: r.rating ?? 5,
      date: new Date(r._creationTime ?? Date.now()).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      text: r.comment ?? "",
      class: null,
    }));

    return jsonResponse(formatted, request);
  } catch (error) {
    return jsonResponse([], request);
  }
}
