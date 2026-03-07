import { NextRequest } from "next/server";
import { getConvexClient } from "@/lib/convex-server";
import { handleCors, jsonResponse } from "@/lib/cors";
import { api } from "@/convex/_generated/api";

function formatTime(ts: number | undefined): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request)!;
}

export async function GET(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const convex = getConvexClient();
    const contacts = await convex.query(api.contacts.list);

    const formatted = (contacts ?? []).map((c: any) => ({
      id: c.contactUserId ?? c._id,
      name: c.name ?? "Unknown",
      avatar: c.avatar ?? "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
      lastMsg: c.lastMsg ?? c.lastMessage ?? "",
      time: formatTime(c.lastMsgTime ?? c.lastMessageTime),
      unread: c.unread ?? 0,
      status: c.status ?? "offline",
      skill: c.skill ?? "",
    }));

    return jsonResponse(formatted, request);
  } catch (error) {
    return jsonResponse([], request);
  }
}
