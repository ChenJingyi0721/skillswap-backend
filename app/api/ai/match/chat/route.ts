import { NextRequest } from "next/server";
import { getConvexClient } from "@/lib/convex-server";
import { handleCors, jsonResponse } from "@/lib/cors";
import { api } from "@/convex/_generated/api";

export async function OPTIONS(request: NextRequest) {
  return handleCors(request)!;
}

export async function POST(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  try {
    const body = await request.json();
    const messages = body.messages ?? [];

    const lastUserMsg = [...messages].reverse().find(
      (m: any) => m.role === "user"
    );

    if (!lastUserMsg) {
      return jsonResponse({
        text: "Hi! I'm your AI matching assistant. Tell me what skills you'd like to learn or teach!",
        skillIds: [],
      }, request);
    }

    const convexMessages = messages.map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.text ?? m.content ?? "",
    }));

    const convex = getConvexClient();
    const result = await convex.action(api.ai.matchChat, {
      messages: convexMessages,
    });

    return jsonResponse({
      text: result?.reply ?? "I found some matches for you!",
      skillIds: result?.matchSuggestion ? [] : [],
    }, request);
  } catch (error) {
    return jsonResponse({
      text: "I'm having trouble connecting right now. Please try again!",
      skillIds: [],
    }, request);
  }
}
