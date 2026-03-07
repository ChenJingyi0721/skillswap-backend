import { NextRequest } from "next/server";
import { getConvexClient } from "@/lib/convex-server";
import { handleCors, jsonResponse } from "@/lib/cors";
import { api } from "@/convex/_generated/api";

export async function OPTIONS(request: NextRequest) {
  return handleCors(request)!;
}

const ICONS = ["rocket", "star", "sparkles", "zap", "flame", "heart"];
const COLORS = [
  "bg-blue-100 text-blue-600",
  "bg-green-100 text-green-600",
  "bg-purple-100 text-purple-600",
  "bg-yellow-100 text-yellow-600",
  "bg-pink-100 text-pink-600",
  "bg-indigo-100 text-indigo-600",
];

function formatTime(ts: number | undefined): string {
  if (!ts) return "recently";
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export async function GET(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const convex = getConvexClient();
    const updates = await convex.query(api.posts.listCommunityUpdates);

    const formatted = (updates ?? []).map((u: any, idx: number) => ({
      id: idx + 1,
      text: `${u.userName} ${u.action}${u.detail ? `: ${u.detail}` : ""}`,
      time: formatTime(u._creationTime),
      icon: ICONS[idx % ICONS.length],
      color: COLORS[idx % COLORS.length],
    }));

    return jsonResponse(formatted, request);
  } catch (error) {
    return jsonResponse([], request);
  }
}
