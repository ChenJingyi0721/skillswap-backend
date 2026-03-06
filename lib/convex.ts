import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

if (!convexUrl) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL 未设置。请在 .env.local 中配置 Convex 部署地址。"
  );
}

export const convex = new ConvexReactClient(convexUrl);
