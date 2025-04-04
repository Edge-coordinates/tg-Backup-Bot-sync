import { Message, InputMediaDocument, InputMedia } from "grammy/types";
import { Context } from "grammy";

import {
  parseTelegramMessageLink,
  getNextLink,
  getForwardFromID,
} from "./basicUtils";
import { forwardMessageWithAutoRetry } from "./safeReply";

const tmpchatId: any = process.env.tmpchatAId;

export interface FileGroupResult {
  group: InputMedia[];
  nextMessageLink?: string;
}

// 判断消息是否是文件类型（Document）
function isMediaDocument(msg: Message): boolean {
  return !!msg.document;
}

// 提取 InputMediaDocument（文件）
function extractDocument(
  msg: Message,
  withCaption: boolean
): InputMediaDocument | null {
  if (msg.document) {
    const base: InputMediaDocument = {
      type: "document",
      media: msg.document.file_id,
    };
    if (withCaption && msg.caption) {
      base.caption = msg.caption;
      base.caption_entities = msg.caption_entities;
    }
    return base;
  }
  return null;
}

export async function buildFileGroupChainFrom(
  startMsg: Message,
  startLink: string,
  ctx: Context
): Promise<FileGroupResult> {
  const result: FileGroupResult = {
    group: [],
    nextMessageLink: undefined,
  };

  // 提取第一条文件消息
  const first = extractDocument(startMsg, true);
  if (!first) return result;

  result.group.push(first);

  let currentLink = startLink;
  const startFromId = getForwardFromID(startMsg);

  while (true) {
    currentLink = getNextLink(currentLink);
    result.nextMessageLink = currentLink;

    const { sourceChatId, messageId } = parseTelegramMessageLink(currentLink);

    let nextMsg: Message | null = null;
    try {
      // 尝试转发消息到临时 chat，以获取 message 内容
      // nextMsg = await ctx.api.forwardMessage(
      nextMsg = await forwardMessageWithAutoRetry(
        ctx.api,
        tmpchatId,
        sourceChatId,
        messageId
      );
    } catch (error) {
      console.error(`Error forwarding message: ${error}`);
      result.nextMessageLink = getNextLink(currentLink);
      break;
    }
    if (!nextMsg) break;

    // 确保是同一作者的连续文件消息
    const nextFromId = getForwardFromID(nextMsg);
    if (nextFromId !== startFromId) break;

    // 仅允许无 caption 的连续文件
    if (!isMediaDocument(nextMsg)) break;
    if (nextMsg.caption) break;

    const media = extractDocument(nextMsg, false);
    if (!media) break;

    result.group.push(media);
  }

  return result;
}
