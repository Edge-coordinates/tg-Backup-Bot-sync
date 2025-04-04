import { MiddlewareFn } from "grammy";

const ADMIN_ID = process.env.ADMIN_ID || "";
// const rawAllowedIds = process.env.ALLOWED_USERS || "";
const allowedIds = ADMIN_ID.split(",").map((id) => Number(id.trim()));

// 你可以从 config 文件、数据库等加载允许的用户 ID
const allowedUserIds = new Set(allowedIds);

export function withAuth(handler: MiddlewareFn): MiddlewareFn {
  return async (ctx, next) => {
    // console.log(ctx.from?.id, allowedIds);
    const userId = ctx.from?.id;
    if (!userId || !allowedUserIds.has(userId)) {
      await ctx.reply("❌ 你没有权限使用这个命令");
      return;
    }
    await handler(ctx, next); // 如果通过，调用原 handler
  };
}
