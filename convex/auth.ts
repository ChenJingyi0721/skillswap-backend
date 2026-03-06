import { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * 从 Convex 上下文中获取已认证的用户信息。
 * Clerk JWT 由 Convex 自动校验，此处只需读取 identity 并关联 users 表。
 */
export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const clerkId = identity.subject;
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();

  return user;
}

/**
 * 要求用户必须已登录，否则抛出异常。
 * 用于 mutation / query 的鉴权守卫。
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const user = await getAuthenticatedUser(ctx);
  if (!user) {
    throw new Error("未授权：请先登录");
  }
  return user;
}
