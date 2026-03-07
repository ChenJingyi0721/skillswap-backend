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
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const convex = getConvexClient();
    const skills = await convex.query(api.skills.list, {
      category: category && category !== "All Skills" ? category : undefined,
      search: search || undefined,
    });

    const formatted = skills.map((s: any, idx: number) => ({
      id: idx + 1,
      title: s.title,
      user: s.user ?? "Unknown",
      avatar: s.avatar ?? "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
      type: s.category ?? "Other",
      distance: "Nearby",
      image: s.image ?? `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400`,
      rating: s.rating ?? 4.5,
      lessons: s.lessons ?? 0,
      speaks: Array.isArray(s.speaks) ? s.speaks.join(", ") : s.speaks ?? "",
      price: typeof s.price === "string" ? parseInt(s.price) || 2 : s.price ?? 2,
      description: s.description ?? "",
      tag: s.skillTag ?? s.category ?? "",
    }));

    return jsonResponse(formatted, request);
  } catch (error) {
    return jsonResponse([], request);
  }
}
