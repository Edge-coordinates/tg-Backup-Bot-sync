import {
  Message,
  InputMediaPhoto,
  InputMediaVideo,
  InputMedia,
} from "grammy/types";
import { Context } from "grammy";

import { parseTelegramMessageLink } from "./basicUtils";

function isMediaPhotoOrVideo(msg: Message): boolean {
  return !!(msg.photo || msg.video);
}

function hasCaption(msg: Message): boolean {
  return !!msg.caption && msg.caption.length > 0;
}

function extractPhotoOrVideo(
  msg: Message,
  withCaption: boolean
): InputMediaPhoto | InputMediaVideo | null {
  if (msg.photo && msg.photo.length > 0) {
    const largest = msg.photo[msg.photo.length - 1];
    const base: InputMediaPhoto = {
      type: "photo",
      media: largest.file_id,
    };
    if (withCaption && msg.caption) {
      base.caption = msg.caption;
      base.caption_entities = msg.caption_entities;
    }
    return base;
  }

  if (msg.video) {
    const base: InputMediaVideo = {
      type: "video",
      media: msg.video.file_id,
    };
    if (withCaption && msg.caption) {
      base.caption = msg.caption;
      base.caption_entities = msg.caption_entities;
    }
    return base;
  }

  return null;
}

import { getNextLink, getForwardFromID } from "./basicUtils";
import { forwardMessageWithAutoRetry } from "./safeReply";

const tmpchatId: any = process.env.tmpchatAId;

export interface MediaGroupResult {
  group: InputMedia[];
  nextMessageLink?: string;
}

export async function buildMediaGroupChainFrom(
  startMsg: Message,
  startLink: string,
  ctx: Context
): Promise<MediaGroupResult> {
  const result: MediaGroupResult = {
    group: [],
    nextMessageLink: undefined,
  };

  const first = extractPhotoOrVideo(startMsg, true);
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

    // Check if next message is from the same user
    const nextFromId = getForwardFromID(nextMsg);
    // console.error(`nextFromId: ${nextFromId}, startFromId: ${startFromId}`);

    if (nextFromId !== startFromId) break;

    if (!isMediaPhotoOrVideo(nextMsg)) break;
    if (hasCaption(nextMsg)) break;

    const media = extractPhotoOrVideo(nextMsg, false);
    if (!media) break;

    result.group.push(media);
  }

  return result;
}
