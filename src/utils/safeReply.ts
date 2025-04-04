import { Context } from "grammy";
import { GrammyError } from "grammy";

export async function safeReply(ctx: Context, message: string) {
  try {
    return await ctx.reply(message);
  } catch (err) {
    if (err instanceof GrammyError && err.error_code === 429) {
      const waitTime = err.parameters?.retry_after ?? 5;
      console.warn(`⚠️ 被限流，等待 ${waitTime}s 后重试: ${message}`);
      await new Promise((r) => setTimeout(r, waitTime * 1000));
      return await ctx.reply(message + "（重试）");
    } else {
      console.error("❌ 回复失败:", err);
    }
  }
}
