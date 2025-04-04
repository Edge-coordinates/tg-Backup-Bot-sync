import { Bot, Context } from "grammy";

import {
  parseTelegramMessageLink,
  appendToFirstCaption,
  messageMetaData,
  buildTextMessageObject,
} from "../utils/basicUtils";

import { withAuth } from "../middleware/auth";
import { buildTextGroupChainFrom } from "../utils/buildReplyGroup";
import { Message } from "grammy/types";

export function registerCopyReplyGroup(bot: Bot) {
  bot.command(
    "copy_reply_group",
    withAuth(async (ctx) => {
      await copyReplyGroup(ctx);
    })
  );
}

export async function copyReplyGroup(ctx: Context) {
  if (!ctx.message) {
    return ctx.reply("无法获取消息内容");
  }
  const args = ctx.message.text?.split(" ");
  const targetMessageLink: string | any = args?.[1];
  if (!targetMessageLink) {
    return ctx.reply("请提供消息链接");
  }

  const targetChatId = ctx.chat!.id;
  const { sourceChatId, messageId } =
    parseTelegramMessageLink(targetMessageLink);

  ctx.reply("开始转发");
  let fwd: Message;
  try {
    fwd = await ctx.api.forwardMessage(
      process.env.tmpchatAId!,
      sourceChatId,
      messageId
    );
  } catch (error) {
    console.error("转发失败:", error);
    ctx.reply("转发失败，请检查链接是否正确");
    return;
  }

  const { combinedText, nextMessageLink } = await buildTextGroupChainFrom(
    fwd,
    targetMessageLink,
    ctx
  );

  // appendToFirstCaption(group, "#图集 #每日一图\n👉 <a href=\"https://t.me/xxx\">原频道</a>", "HTML");
  let msgDate = messageMetaData(fwd);
  const source: string = `\n#评论内容 Author: ${(fwd as any).forward_from.first_name}\nsource: ${targetMessageLink}\ntime: ${msgDate}`;
  let tmsg = buildTextMessageObject(combinedText + source);

  if (nextMessageLink) {
    ctx.reply(nextMessageLink!);
  }

  try {
    if (combinedText) {
      await ctx.api.sendMessage(targetChatId, tmsg.text, {
        parse_mode: tmsg.parse_mode,
      });
    } else {
      ctx.reply("没有找到可复制的评论组");
    }
  } catch (error) {
    console.error("发送图集失败:", error);
    ctx.reply("发送图集失败，请检查链接是否正确");
  }
}
