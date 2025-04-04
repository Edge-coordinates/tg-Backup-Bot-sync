import { Bot, Context } from "grammy";

import {
  parseTelegramMessageLink,
  appendToFirstCaption,
  messageMetaData,
} from "../utils/basicUtils";

import { withAuth } from "../middleware/auth";
import { buildFileGroupChainFrom } from "../utils/buildFileGroup";
import { Message } from "grammy/types";
import { forwardMessageWithAutoRetry } from "../utils/safeReply";

export function registerCopyFileGroup(bot: Bot) {
  bot.command(
    "copy_file_group",
    withAuth(async (ctx) => {
      await copyFileGroup(ctx);
    })
  );
}

export async function copyFileGroup(ctx: Context) {
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
    // fwd = await ctx.api.forwardMessage(
    fwd = await forwardMessageWithAutoRetry(
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

  const { group, nextMessageLink } = await buildFileGroupChainFrom(
    fwd,
    targetMessageLink,
    ctx
  );

  // appendToFirstCaption(group, "#图集 #每日一图\n👉 <a href=\"https://t.me/xxx\">原频道</a>", "HTML");
  let msgDate = messageMetaData(fwd);
  const source: string = `source: ${targetMessageLink}\ntime: ${msgDate}`;
  appendToFirstCaption(group, source, "HTML");
  
  if (nextMessageLink) {
    ctx.reply(nextMessageLink!);
  }

  try {
    if (group.length > 0) {
      await ctx.api.sendMediaGroup(targetChatId, group as any);
    } else {
      ctx.reply("没有找到可复制的媒体");
    }
  } catch (error) {
    console.error("发送图集失败:", error);
    ctx.reply("发送图集失败，请检查链接是否正确");
  }
}
