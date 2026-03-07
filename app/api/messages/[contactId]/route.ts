import { NextRequest } from "next/server";
import { getConvexClient } from "@/lib/convex-server";
import { handleCors, jsonResponse } from "@/lib/cors";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export async function OPTIONS(request: NextRequest) {
  return handleCors(request)!;
}

function formatTime(ts: number | undefined): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const { contactId } = await params;
    const convex = getConvexClient();
    const messages = await convex.query(api.messages.listByContact, {
      contactId: contactId as Id<"users">,
    });

    const formatted = (messages ?? []).map((m: any, idx: number) => ({
      id: idx + 1,
      sender: m.sender ?? (m.isFromMe ? "me" : "them"),
      text: m.text ?? m.content ?? "",
      time: formatTime(m._creationTime),
      type: m.type === "skill_request" ? "proposal" : m.type === "ai_suggestion" ? "ai_trans" : m.type ?? "text",
      status: m.status === "sent" ? null : m.status ?? null,
      skill_me: m.skillMe ?? null,
      skill_them: m.skillThem ?? null,
      time_slot: m.timeSlot ?? null,
      icon: null,
    }));

    return jsonResponse(formatted, request);
  } catch (error) {
    return jsonResponse([], request);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const { contactId } = await params;
    const body = await request.json();

    const convex = getConvexClient();
    await convex.mutation(api.messages.send, {
      contactId: contactId as Id<"users">,
      text: body.text ?? "",
      type: body.type === "proposal" ? "skill_request" : body.type === "ai_trans" ? "ai_suggestion" : "text",
      skillMe: body.skill_me ?? undefined,
      skillThem: body.skill_them ?? undefined,
      timeSlot: body.time_slot ?? undefined,
    });

    return jsonResponse({ id: Date.now(), success: true }, request);
  } catch (error) {
    return jsonResponse({ error: "Failed to send message" }, request, 500);
  }
}
