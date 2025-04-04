import { Message } from "grammy/types";
import { Context } from "grammy";

import {
  parseTelegramMessageLink,
  getNextLink,
  getForwardFromID,
  isPlainTextMessage,
} from "./basicUtils";

const tmpchatId: any = process.env.tmpchatAId;

export interface TextGroupResult {
  combinedText: string;
  nextMessageLink?: string;
}

export async function buildTextGroupChainFrom(
  startMsg: Message,
  startLink: string,
  ctx: Context
): Promise<TextGroupResult> {
  const result: TextGroupResult = {
    combinedText: "",
    nextMessageLink: undefined,
  };

  // 确保起始消息是文本
  if (!isPlainTextMessage(startMsg)) return result;

  result.combinedText += startMsg.text + "\n-------\n";

  let currentLink = startLink;
  const startFromId = getForwardFromID(startMsg);

  while (true) {
    currentLink = getNextLink(currentLink);
    result.nextMessageLink = currentLink;

    const { sourceChatId, messageId } = parseTelegramMessageLink(currentLink);

    let nextMsg: Message | null = null;
    try {
      // 尝试转发消息到临时 chat，以获取 message 内容
      nextMsg = await ctx.api.forwardMessage(
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

    const nextFromId = getForwardFromID(nextMsg);
    if (nextFromId !== startFromId) break;

    if (!isPlainTextMessage(nextMsg)) break;

    result.combinedText += nextMsg.text + "\n-------\n";
  }

  return result;
}
