// ! 这个方法是不可行的，因为同一个 message 里面的 所有 media 是一个张图片，只是不同分辨率
// ! 所以需要分开处理

import {
  InputMediaPhoto,
  InputMediaVideo,
  InputMediaDocument,
  InputMediaAudio,
} from "grammy/types";

type InputMedia =
  | InputMediaPhoto
  | InputMediaVideo
  | InputMediaDocument
  | InputMediaAudio;

type TelegramPhotoSize = {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
};

type TelegramMessage = {
  caption?: string;
  caption_entities?: any[];
  photo?: TelegramPhotoSize[];
  video?: { file_id: string };
  document?: { file_id: string };
  audio?: { file_id: string };
};

type MessagePayload = {
  mediaGroup?: Array<InputMedia>;
  text?: string;
  entities?: any[];
};

/**
 * 传入 Telegram 消息，自动构造媒体组和文本信息
 * @param msg Telegram 原始消息对象
 * @param extraText 可选 - 添加到 caption 后的文字
 */
export function buildMessagePayload(
  msg: TelegramMessage,
  extraText: string = ""
): MessagePayload {
  const payload: MessagePayload = {};

  const mediaGroup: InputMedia[] = [];

  if (msg.photo && msg.photo.length > 0) {
    for (const photo of msg.photo) {
      mediaGroup.push({ type: "photo", media: photo.file_id });
    }
  }

  if (msg.video) {
    mediaGroup.push({ type: "video", media: msg.video.file_id });
  }

  if (msg.document) {
    mediaGroup.push({ type: "document", media: msg.document.file_id });
  }

  if (msg.audio) {
    mediaGroup.push({ type: "audio", media: msg.audio.file_id });
  }

  if (mediaGroup.length > 0) {
    payload.mediaGroup = mediaGroup;
  }

  if (msg.caption || extraText) {
    payload.text = (msg.caption ?? "") + extraText;
    payload.entities = msg.caption_entities ?? undefined;
  }

  return payload;
}
