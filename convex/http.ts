import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

/**
 * Clerk Webhook 处理：用户创建/更新时同步到 Convex
 * 在 Clerk Dashboard 设置 Webhook URL: https://your-convex.convex.site/clerk-webhook
 */
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const eventType = body.type;

    if (eventType === "user.created" || eventType === "user.updated") {
      const userData = body.data;
      const clerkId = userData.id;
      const name =
        `${userData.first_name ?? ""} ${userData.last_name ?? ""}`.trim() ||
        userData.username ||
        "新用户";
      const avatar = userData.image_url;

      const existing = await ctx.runQuery(
        // @ts-expect-error internal query
        "users:getByClerkId" as any,
        { clerkId }
      );

      if (existing) {
        await ctx.runMutation(
          // @ts-expect-error internal mutation
          "users:updateByClerkId" as any,
          { clerkId, name, avatar }
        );
      } else {
        await ctx.runMutation(
          // @ts-expect-error internal mutation
          "users:createFromWebhook" as any,
          { clerkId, name, avatar }
        );
      }
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
