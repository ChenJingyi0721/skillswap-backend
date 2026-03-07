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
    const convex = getConvexClient();
    const result = await convex.mutation(api.seed.seedDemoData);
    return jsonResponse({ success: true, message: result?.message ?? "Database seeded" }, request);
  } catch (error) {
    return jsonResponse({ error: "Failed to seed database" }, request, 500);
  }
}
