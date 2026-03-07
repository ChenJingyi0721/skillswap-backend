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
    const { searchParams } = new URL(request.url);
    const skillTag = searchParams.get("skillTag") ?? undefined;

    const convex = getConvexClient();
    const experts = await convex.query(api.skills.getSimilarExperts, { skillTag });

    const formatted = (experts ?? []).map((e: any) => ({
      name: e.name ?? "Expert",
      image: e.avatar ?? "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
      lessons: e.lessons ?? 0,
      rating: e.rating ?? 5.0,
      price: String(e.price ?? "2.00"),
    }));

    return jsonResponse(formatted, request);
  } catch (error) {
    return jsonResponse([], request);
  }
}
