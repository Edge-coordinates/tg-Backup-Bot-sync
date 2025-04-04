import { Context } from "grammy";
import { Message } from "grammy/types";
import { GrammyError } from "grammy";
import { writeMessageToFile } from "./basicUtils";
import { BasicErrorLog } from "./myLogger";

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

export async function forwardMessageWithAutoRetry(
  api: Context["api"],
  toChatId: number | string,
  fromChatId: number | string,
  messageId: number,
  delay = 100,
  maxRetries = 3
): Promise<Message> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await api.forwardMessage(toChatId, fromChatId, messageId);
      await new Promise((res) => setTimeout(res, delay));
      return res;
    } catch (err: any) {
      // 🧠 检查是否是 rate limit 错误
      if (
        err.error_code === 429 &&
        typeof err.parameters?.retry_after === "number"
      ) {
        const waitTimeSec = err.parameters.retry_after;
        // console.warn(
        //   `⏳ 第 ${attempt} 次触发速率限制，等待 ${waitTimeSec} 秒后重试...`
        // );
        console.warn(`触发速率限制，等待 ${waitTimeSec} 秒后重试...`);
        await new Promise((res) => setTimeout(res, waitTimeSec * 1000));
        // continue; // 重试
      }

      // ❌ 其他错误：直接抛出
      console.error(
        `❌ forwardMessage failed: from ${fromChatId}#${messageId} → ${toChatId}`
      );
      throw err;
    }
  }
  BasicErrorLog(`forwardMessage failed: from ${fromChatId}#${messageId} → ${toChatId}`, "error-log-forwardMessage-list.txt");
  throw new Error("⛔️ 超过最大重试次数，仍无法转发该消息");
}
