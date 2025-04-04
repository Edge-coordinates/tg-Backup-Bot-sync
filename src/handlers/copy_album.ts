import { Bot, Context } from "grammy";
import { copyMediaGroupWithTag } from "./copyMediaGroupWithTag";
import { Message } from "grammy/types";
import { buildMessagePayload } from "../utils/messageBuilder1";
import { buildMediaGroupChainFrom } from "../utils/buildMediaGroup";

import {
  parseTelegramMessageLink,
  appendToFirstCaption,
  messageMetaData,
} from "../utils/basicUtils";

import { withAuth } from "../middleware/auth";
import { forwardMessageWithAutoRetry } from "../utils/safeReply";

export function registerCopyAlbum(bot: Bot) {
  bot.command(
    "copy_album",
    withAuth(async (ctx) => {
      await copyAlbum(ctx);
    })
  );
}

export async function copyAlbum(ctx: Context) {
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
  // ctx.reply(
  //   `targetMessageLink: ${targetMessageLink}, sourceChatId: ${sourceChatId}, messageId: ${messageId}`
  // );

  ctx.reply("开始转发");
  // 用 forwardMessage 获取 media_group_id（Bot API 无 getMessage）
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

  const { group, nextMessageLink } = await buildMediaGroupChainFrom(
    fwd,
    targetMessageLink,
    ctx
  );

  // appendToFirstCaption(group, "#图集 #每日一图\n👉 <a href=\"https://t.me/xxx\">原频道</a>", "HTML");
  let msgDate = messageMetaData(fwd);
  const source: string = `source: ${targetMessageLink}\ntime: ${msgDate}\nauthor_signature: ${(fwd as any).forward_signature}`;
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
