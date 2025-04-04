import { Message } from "grammy/types";
import { Bot, Context } from "grammy";

import {
  parseTelegramMessageLink,
  getNextLink,
  getForwardFromID,
  messageMetaData,
  appendToFirstCaption,
  buildTextMessageObject,
  isPlainTextMessage,
  buildFormattedTextMessage,
  isTargetPersonalMessage,
} from "../utils/basicUtils";

import { buildMediaGroupChainFrom } from "../utils/buildMediaGroup";
import { buildFileGroupChainFrom } from "../utils/buildFileGroup";
import { buildTextGroupChainFrom } from "../utils/buildReplyGroup";
import { withAuth } from "../middleware/auth";
import { BasicErrorLog } from "../utils/myLogger";
import { writeMessageToFile } from "../utils/basicUtils";
const tmpchatId: any = process.env.tmpchatAId;

export interface TextGroupResult {
  combinedText: string;
  nextMessageLink?: string;
}

let currentLink: string;
let targetChannelID: string | any;
let fromChannelID: string | any;
let isPersonalMessage = false;
let LookForReply = false;

export function registerBackupMethod(bot: Bot) {
  bot.command(
    "backup",
    withAuth(async (ctx) => {
      let startLink = ctx.message?.text?.split(" ")[1];
      let endLink = ctx.message?.text?.split(" ")[2];
      if (!startLink || !endLink) {
        await ctx.reply("请提供正确的链接");
        return;
      }
      await mainBackUpMethod(ctx, startLink, endLink);
    })
  );
}

function isBackupEdn(currentLink, endLink) {
  const { sourceChatId, messageId } = parseTelegramMessageLink(currentLink);
  const { sourceChatId: endSourceChatId, messageId: endMessageId } =
    parseTelegramMessageLink(endLink);
  // return sourceChatId === endSourceChatId && messageId === endMessageId;
  return messageId <= endMessageId;
}

export async function mainBackUpMethod(
  ctx: Context,
  startLink: string,
  endLink: string
) {
  targetChannelID = process.env.backup_channel_id;
  fromChannelID = process.env.from_channel_id;
  currentLink = startLink;

  ctx.reply("开始备份！");

  // ANCHOR 进入 While 循环，开始转发
  while (isBackupEdn(currentLink, endLink)) {
    const { sourceChatId, messageId } = parseTelegramMessageLink(currentLink);
    // fromChannelID = sourceChatId; // 不能这么写，我转发的群组里的频道

    let msg: Message | null = null;
    try {
      msg = await ctx.api.forwardMessage(tmpchatId, sourceChatId, messageId);
    } catch (error) {
      console.error(`forwardMessage error: ${error}`);
    }

    if (!msg) {
      BasicErrorLog(
        `forwardMessage error(msg is null): ${currentLink}\n`,
        "error-log-local-backup.txt"
      );
      LookForReply = false;
      // # 更新 currentLink
      currentLink = getNextLink(currentLink);
      continue;
    }

    // writeMessageToFile(msg, messageId);

    const fromId = getForwardFromID(msg);
    const isFromChannel = String(fromId) == fromChannelID;
    // const isFromChannel = true;
    // ANCHOR 频道消息处理
    if (isFromChannel) {
      ctx.reply(`正在备份ChannelMSG: ${currentLink}`);
      LookForReply = true;
      isPersonalMessage = false;
      await handleMessageByType(ctx, msg);
      // forwardingPersonal = true;
    } else if (LookForReply && isTargetPersonalMessage(String(fromId))) {
      console.log(`isTargetPersonalMessage: ${fromId}`);
      // ANCHOR 个人消息处理
      ctx.reply(`正在备份PersonalMSG: ${currentLink}`);
      isPersonalMessage = true;
      // await ctx.reply("👤 正在处理来自个人的连续文本...");
      await handleMessageByType(ctx, msg);
    } else {
      LookForReply = false;
      // isPersonalMessage = false;
      // # 更新 currentLink
      currentLink = getNextLink(currentLink);
    }
  }

  await ctx.reply("✅ 备份完成");
}

// ANCHOR handleMessageByType
async function handleMessageByType(ctx: Context, msg: Message) {
  // 判断消息类型
  if (msg.photo || msg.video) {
    // * 媒体组
    // await ctx.reply("▶️ 正在转发媒体组 (photo/video)...");
    const mediaResult = await buildMediaGroupChainFrom(msg, currentLink, ctx);
    // console.log(mediaResult);

    // 媒体组签名
    let msgDate = messageMetaData(msg);
    let source: string;
    if (isPersonalMessage) {
      source = `Comment | Author: ${
        (msg as any).forward_from.first_name
      }\nsource: ${currentLink}\ntime: ${msgDate}`;
    } else {
      source = `source: ${currentLink}\ntime: ${msgDate}\nauthor_signature: ${
        (msg as any).forward_signature
      }`;
    }
    appendToFirstCaption(mediaResult.group, source, "HTML");

    // # 更新 currentLink
    currentLink = mediaResult.nextMessageLink || getNextLink(currentLink);
    try {
      if (mediaResult.group.length > 0) {
        await ctx.api.sendMediaGroup(targetChannelID, mediaResult.group as any);
      } else {
        BasicErrorLog(`sendMediaGroup error(group is empty): ${currentLink}`);
      }
    } catch (error) {
      BasicErrorLog(`sendMediaGroup error: ${error}`);
    }
  } else if (msg.document) {
    // * 文件组
    // await ctx.reply("📎 正在转发文件组...");
    const fileResult = await buildFileGroupChainFrom(msg, currentLink, ctx);

    // 文件组签名
    let msgDate = messageMetaData(msg);
    let source: string;
    if (isPersonalMessage) {
      source = `Comment | Author: ${
        (msg as any).forward_from.first_name
      }\nsource: ${currentLink}\ntime: ${msgDate}`;
    } else {
      source = `source: ${currentLink}\ntime: ${msgDate}\nauthor_signature: ${
        (msg as any).forward_signature
      }`;
    }
    appendToFirstCaption(fileResult.group, source, "HTML");

    // # 更新 currentLink
    currentLink = fileResult.nextMessageLink || getNextLink(currentLink);
    try {
      if (fileResult.group.length > 0) {
        await ctx.api.sendMediaGroup(targetChannelID, fileResult.group as any);
      } else {
        BasicErrorLog(`sendMediaGroup error(group is empty): ${currentLink}`);
      }
    } catch (error) {
      BasicErrorLog(`sendMediaGroup error: ${error}`);
    }
  } else if (isPlainTextMessage(msg)) {
    if (isPersonalMessage) {
      // * 回复消息
      // 不保留原样式，但是大概影响不大

      const replyResult = await buildTextGroupChainFrom(msg, currentLink, ctx);

      // 回复组签名
      let msgDate = messageMetaData(msg);
      const source: string = `\n#Comment | Author: ${
        (msg as any).forward_from.first_name
      }\nsource: ${currentLink}\ntime: ${msgDate}`;
      let tmsg = buildTextMessageObject(replyResult.combinedText + source);

      // # 更新 currentLink
      currentLink = replyResult.nextMessageLink || getNextLink(currentLink);
      try {
        await ctx.api.sendMessage(targetChannelID, tmsg.text, {
          parse_mode: tmsg.parse_mode,
        });
      } catch (error) {
        BasicErrorLog(`sendMessage error: ${error}`);
      }
    } else {
      // * 普通消息 签名转发
      // 签名
      let msgDate = messageMetaData(msg);
      const source: string = `source: ${currentLink}\ntime: ${msgDate}\nauthor_signature: ${
        (msg as any).forward_signature
      }`;
      const textMsg = buildFormattedTextMessage(msg.text, msg.entities, source);

      try {
        await ctx.api.sendMessage(targetChannelID, textMsg.text, {
          // parse_mode: "HTML",
          entities: textMsg.entities,
        });
      } catch (error) {
        BasicErrorLog(`sendMessage error: ${error}`);
      }

      // # 更新 currentLink
      currentLink = getNextLink(currentLink);
    }
  } else {
    // BasicErrorLog(`handleMessageByType error(msg is not text/photo/video/document): ${currentLink}`);
    // # 更新 currentLink
    currentLink = getNextLink(currentLink);
  }
}
