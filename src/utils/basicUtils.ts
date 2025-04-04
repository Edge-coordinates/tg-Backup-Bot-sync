import { Context } from "grammy";

// ANCHOR normalizeChatId
export function normalizeChatId(
  sourceChatId: string
  // ctx?: Context // grammY 上下文对象，用于调用 getChat
) {
  if (sourceChatId.startsWith("-100")) {
    // 已是正确格式的私有 chat_id，无需处理
    return sourceChatId;
  } else {
    // 对于公共频道/群组，从 @username 或 t.me/c/xxx 中获取的是短 ID，需要补上 -100 前缀
    // 例如从链接中解析出的是 "1672129277"，应转为 "-1001672129277"
    return `-100${sourceChatId}`;

    // 💡 如果你需要用 username 或公开链接判断真实 chat_id，也可以使用：
    // const chat = await ctx.api.getChat('@yourchannel');
    // return chat.id.toString();
  }
}

interface ParsedTelegramLink {
  sourceChatId: string;
  messageId: number;
}

/**
 * ANCHOR 从 Telegram 消息链接中提取 chatId 和 messageId
 * 示例链接：https://t.me/c/1672129277/12345
 */
export function parseTelegramMessageLink(link: string): ParsedTelegramLink {
  const linkParts = link.trim().split("/");
  let sourceChatId = linkParts[linkParts.length - 2];
  const messageId = parseInt(linkParts[linkParts.length - 1], 10);

  if (!sourceChatId || isNaN(messageId)) {
    throw new Error(`Invalid Telegram message link: ${link}`);
  }

  sourceChatId = normalizeChatId(sourceChatId);

  return {
    sourceChatId,
    messageId,
  };
}

import { InputMedia, Message, MessageEntity } from "grammy/types";

/**
 * ANCHOR 给 media group 的第一项 caption 增加额外内容（如 #标签）
 * @param group InputMedia[] - 媒体组
 * @param extraText string - 要追加的文本（如 '\n#图集 #每日一图'）
 * @param parseMode 可选 - Telegram 的解析模式（默认 HTML）
 */
export function appendToFirstCaption(
  group: InputMedia[],
  extraText: string,
  parseMode: "HTML" | "MarkdownV2" = "HTML"
): void {
  if (group.length === 0) return;

  const first = group[0];

  const originalCaption = first.caption ?? "";
  const entities = (first as any).caption_entities;

  first.caption = `${originalCaption}\n${extraText}`.trim();

  if (entities) {
    // 保留原有格式
    (first as any).caption_entities = entities;
  } else {
    // 启用 parse_mode（用于手动格式）
    first.parse_mode = parseMode;
  }
}

// ANCHOR getNextLink
export function getNextLink(link: string): string {
  const parts = link.split("/");
  const last = parseInt(parts.pop()!, 10);
  parts.push((last + 1).toString());
  return parts.join("/");
}

// ANCHOR getMessageLinkFromForward
export function getMessageLinkFromForward(nextMsg: any): string | null {
  const fwdFrom = nextMsg.forward_from_chat;
  const messageId = nextMsg.forward_from_message_id;

  if (!fwdFrom || !messageId) {
    return null; // 无法获取来源
  }

  if (fwdFrom.username) {
    // 公开频道，有 @username
    return `https://t.me/${fwdFrom.username}/${messageId}`;
  } else {
    // 私有频道或无用户名，用 internal id
    const internalId = Math.abs(fwdFrom.id) - 1000000000000;
    return `https://t.me/c/${internalId}/${messageId}`;
  }
}

// ANCHOR getMessageLinkFromID
export function getMessageLinkFromID(
  chatId: string,
  messageId: number
): string {
  const internalId = Math.abs(parseInt(chatId, 10)) - 1000000000000;
  return `https://t.me/c/${internalId}/${messageId}`;
}

// ANCHOR getForwardFromID
export function getForwardFromID(message: Message | any): string | null {
  // if (Object.hasOwn(message, "forward_from_chat")) {
  if (message.hasOwnProperty("forward_from_chat")) {
    // 转发自频道
    return message.forward_from_chat.id;
  } else if (message.hasOwnProperty("forward_from")) {
    // 转发自用户
    return message.forward_from.id;
  } else {
    return null;
  }
}

// ANCHOR getMessageDate
export function messageMetaData(message: Message) {
  // 增加发布时间，浏览数量，reaction 等信息
  // 实际上的话，大概只需要 发布时间，浏览数量就可以了
  // const date = message.date; // 是 Unix timestamp（秒）
  const date = (message as any).forward_origin.date;
  // const views = (message as any).views; // 仅限频道消息有 views 字段

  // console.log(message);

  const formattedTime = new Date(date * 1000).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  });

  return formattedTime;
}

// ANCHOR buildTextMessageObject
export function buildTextMessageObject(text: string) {
  return {
    text,
    parse_mode: "HTML" as const,
  };
}

// ANCHOR isPlainTextMessage
export function isPlainTextMessage(msg: Message): boolean {
  return typeof msg.text === "string" && msg.text.length > 0;
}

// ANCHOR 保留格式 TXT封装
export function buildFormattedTextMessage(
  text: string | undefined,
  entities: MessageEntity[] | undefined,
  suffix: string
) {
  return {
    text: text + "\n" + suffix,
    entities: adjustEntities(entities, 0), // 保留原格式
  };
}

function adjustEntities(
  entities: MessageEntity[] | undefined,
  shift: number
): MessageEntity[] {
  if (!entities) return [];

  return entities.map((e) => ({
    ...e,
    offset: e.offset,
  }));
}

// ANCHOR 判断是否是要处理的个人

export function isTargetPersonalMessage(userID): boolean {
  let record_reply_user_id: any = process.env.record_reply_user_id;
  if (!record_reply_user_id) {
    return false;
  }
  record_reply_user_id = record_reply_user_id.split(",");
  console.log(record_reply_user_id, userID);
  return record_reply_user_id.includes(userID);
}

// ANCHOR 写入消息到文件
export function writeMessageToFile(message: Message, messageId: number) {
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
}
