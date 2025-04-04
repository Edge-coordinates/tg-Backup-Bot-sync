import { Bot } from "grammy";

import fs from "fs";
import path from "path";

const configPath = path.join(__dirname, "forwarding-config.json");

function loadConfig(): Record<string, string[]> {
  if (!fs.existsSync(configPath)) return {};
  const data = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(data);
}

export function getTargetChannels(sourceChannelId: number | string): string[] {
  const config = loadConfig();
  return config[sourceChannelId.toString()] || [];
}

export function autoForward(bot: Bot) {
  bot.on("channel_post", async (ctx) => {
    const sourceChannelId = ctx.channelPost.chat.id;
    const forwardTargets = await getTargetChannels(sourceChannelId); // 你需要实现这个函数

    for (const targetId of forwardTargets) {
      await ctx.forwardMessage(targetId);
    }
  });
}

