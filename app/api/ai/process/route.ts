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
    const { action, context, targetLanguage } = body;

    const convex = getConvexClient();
    const result = await convex.action(api.ai.processAI, {
      action,
      context: context ?? "",
      targetLanguage: targetLanguage ?? "en",
    });

    return jsonResponse({
      result: result?.result ?? "",
      confidence: result?.confidence ?? 0.95,
      action,
    }, request);
  } catch (error) {
    return jsonResponse({
      result: "AI processing is temporarily unavailable. Please try again later.",
      confidence: 0.5,
      action: "unknown",
    }, request);
  }
}
