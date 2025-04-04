import { Bot } from "grammy";
import {
  buildTextMessageObject,
  messageMetaData,
  parseTelegramMessageLink,
  buildFormattedTextMessage,
} from "../utils/basicUtils";
import { Message } from "grammy/types";
import { forwardMessageWithAutoRetry } from "../utils/safeReply";

export function forwardHistory(bot: Bot) {
  bot.command("forward_text", async (ctx: any) => {
    const args = ctx.message.text?.split(" ");
    const targetMessageLink: string | any = args?.[1];
    if (!targetMessageLink) {
      return ctx.reply("请提供消息链接");
    }

    const targetChatId = ctx.chat!.id;
    const { sourceChatId, messageId } =
      parseTelegramMessageLink(targetMessageLink);

    let msg: Message;
    try {
      // msg = await ctx.api.forwardMessage(
      msg = await forwardMessageWithAutoRetry(
        ctx.api,
        process.env.tmpchatAId!,
        sourceChatId,
        messageId
      );
    } catch (error) {
      console.error("转发失败:", error);
      ctx.reply("转发失败，请检查链接是否正确");
      return;
    }

    let msgDate = messageMetaData(msg);
    const source: string = `source: ${targetMessageLink}\ntime: ${msgDate}\nauthor_signature: ${
      (msg as any).forward_signature
    }`;
    // const textMsg = buildTextMessageObject(msg.text + source);
    const textMsg = buildFormattedTextMessage(msg.text, msg.entities, source);
    await ctx.api.sendMessage(ctx.chat!.id, textMsg.text, {
      // parse_mode: "HTML",
      entities: textMsg.entities,
    });
  });
}
