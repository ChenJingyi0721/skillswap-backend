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
    const filter = searchParams.get("filter");
    const dashboard = searchParams.get("dashboard") === "true";

    const convex = getConvexClient();
    const sessions = await convex.query(api.sessions.list, {
      filter: filter || undefined,
      dashboard,
    });

    if (dashboard && sessions && !Array.isArray(sessions)) {
      const format = (list: any[], sessionType: string) =>
        list.map((s: any, idx: number) => ({
          id: idx + 1,
          type: sessionType,
          skill: s.title,
          title: s.title,
          partner: s.partner ?? s.partnerName ?? "Unknown",
          with: s.partner ?? s.partnerName ?? "Unknown",
          avatar: s.partnerAvatar ?? "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
          date: s.date ?? "TBD",
          time: s.time ?? "TBD",
          status: s.status === "upcoming" ? "Confirmed" : s.status === "pending" ? "Pending" : "Completed",
          roomLink: s.roomLink ?? "#",
          meetingLink: s.roomLink ?? "#",
          rated: s.rated ?? false,
          rating: s.requesterScore ?? s.providerScore ?? null,
        }));

      return jsonResponse([
        ...format((sessions as any).learning ?? [], "Learning"),
        ...format((sessions as any).teaching ?? [], "Teaching"),
      ], request);
    }

    const formatted = (Array.isArray(sessions) ? sessions : []).map((s: any, idx: number) => ({
      id: idx + 1,
      type: s.status === "upcoming" ? "upcoming" : s.status === "pending" ? "pending" : "past",
      skill: s.title,
      title: s.title,
      partner: s.partner ?? s.partnerName ?? "Unknown",
      with: s.partner ?? s.partnerName ?? "Unknown",
      avatar: s.partnerAvatar ?? "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
      date: s.date ?? "TBD",
      time: s.time ?? "TBD",
      status: s.status === "upcoming" ? "Confirmed" : s.status === "pending" ? "Pending" : "Completed",
      roomLink: s.roomLink ?? "#",
      meetingLink: s.roomLink ?? "#",
      rated: s.rated ?? false,
      rating: s.requesterScore ?? s.providerScore ?? null,
    }));

    return jsonResponse(formatted, request);
  } catch (error) {
    return jsonResponse([], request);
  }
}
