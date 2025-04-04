import { Bot, Context } from "grammy";
import { Message } from "grammy/types";
import { normalizeChatId, parseTelegramMessageLink } from "../utils/basicUtils";
import { forwardMessageWithAutoRetry } from "../utils/safeReply";

export function forwardLinkMessage(bot: Bot) {
  bot.command("forward_link", async (ctx) => {
    if (!ctx.message) {
      return ctx.reply("无法获取消息内容");
    }

    const args = ctx.message.text?.split(" ");
    const targetMessageLink: string = args?.[1];

    if (!targetMessageLink) {
      return ctx.reply("请提供消息链接");
    }

    try {
      // Parse the message link
      // Format: https://t.me/c/chat_id/message_id or https://t.me/username/message_id
      const { sourceChatId, messageId } =
        parseTelegramMessageLink(targetMessageLink);

      // Get chat ID from the identifier
      let chatId: string | number = normalizeChatId(sourceChatId);

      // Forward the message
      let message 
      try {
        // message = await ctx.api.forwardMessage(ctx.chat.id, chatId, messageId);
        message = await forwardMessageWithAutoRetry(
          ctx.api,
          ctx.chat.id,
          chatId,
          messageId
        );
      } catch (error) {
        console.error("转发消息失败:", error);
        ctx.reply("转发消息失败，请检查链接是否正确");
        return;
      }

      // console.error(message);
      // console.error((message as any).forward_from_chat);
      // write message to json file
      const fs = require("fs-extra");
      const path = require("path");

      let tmpfilepath = path.join(
        __dirname,
        "..",
        "tmp",
        `message-${messageId}.json`
      );
      fs.ensureFileSync(tmpfilepath);
      fs.writeFileSync(tmpfilepath, JSON.stringify(message, null, 2));

      ctx.reply("消息转发成功");
    } catch (error) {
      console.error("转发消息失败:", error);
      ctx.reply("转发消息失败，请检查链接是否正确");
    }
  });
}
