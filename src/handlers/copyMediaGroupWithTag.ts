import { Bot, Context } from "grammy";
import { InputMediaPhoto, InputMediaVideo } from "grammy/types";

export async function copyMediaGroupWithTag(
  ctx: Context,
  sourceChatId: number | string,
  mediaGroupId: string,
  messages: any[],
  targetChatId: number | string
) {
  const inputMedia: (InputMediaPhoto | InputMediaVideo)[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    let media: InputMediaPhoto | InputMediaVideo | undefined;

    if (msg.photo) {
      media = {
        type: "photo",
        media: msg.photo[msg.photo.length - 1].file_id, // highest resolution
      };
    } else if (msg.video) {
      media = {
        type: "video",
        media: msg.video.file_id,
      };
    }

    if (!media) continue;

    // 如果是第一张，加上 caption 和 source 信息
    if (i === 0) {
      const caption = msg.caption ?? "";
      const suffix = `\n\nsource：\n#${sourceChatId} #${msg.message_id}`;
      media.caption = caption + suffix;
      media.parse_mode = "Markdown";
    } else if (msg.caption) {
      media.caption = msg.caption;
      media.parse_mode = "Markdown";
    }

    inputMedia.push(media);
  }

  if (inputMedia.length === 0) {
    return ctx.reply("未找到可复制的媒体");
  }

  try {
    await ctx.api.sendMediaGroup(targetChatId, inputMedia);
  } catch (error) {
    console.error("发送图集失败:", error);
    ctx.reply("发送图集失败，请检查链接是否正确");
  }
}
