import dotenv from "dotenv";
dotenv.config();

import { Bot, Context } from "grammy";
import { mainBackUpMethod } from "./handlers/mainBackupMethod";
import { SocksProxyAgent } from "socks-proxy-agent";
import fs from "fs-extra";
let baseFetchConfig: any = { compress: true };

if (process.env.Agent) {
  const socksAgent = new SocksProxyAgent("socks://127.0.0.1:7897");
  baseFetchConfig.agent = socksAgent;
}

const bot = new Bot(process.env.BOT_TOKEN!, {
  client: {
    baseFetchConfig,
  },
});

// Error handling and logging to both console and local file
bot.catch((err) => {
  const ctx = err.ctx;
  // Get the message link from ctx.match (if available) or construct it manually
  const messageLink = ctx?.match
    ? ctx.match
    : `https://t.me/c/${ctx?.update?.message?.chat?.id}/${ctx?.update?.message?.message_id}`;

  // Log error to console
  console.error("Error occurred:", err);

  // Append the error and message link to a local log file
  const logMessage = `Error occurred: ${err.message}\nMessage link: ${messageLink}\n\n`;

  // Append the log message to a file (error-log.txt)
  fs.appendFile("error-log-local.txt", logMessage, (fileErr) => {
    if (fileErr) {
      console.error("Error writing to log file:", fileErr);
    } else {
      console.log("Logged error to error-log.txt");
    }
  });
});

// ✅ 从链接中提取 chatId 和 messageId
function parseLink(link: string): { chat_id: number; message_id: number } {
  const match = link.match(/\/c\/(\d+)\/(\d+)/);
  if (!match) throw new Error("链接格式错误");
  const [_, chatIdRaw, messageIdStr] = match;
  const chat_id = -100 * 10 ** 0 + Number(chatIdRaw); // 还原为 -100 开头的 chat_id
  const message_id = Number(messageIdStr);
  return { chat_id, message_id };
}

async function run() {
  const [startLink, endLink] = process.argv.slice(2);
  if (!startLink || !endLink) {
    console.error("请提供起始链接和结束链接！");
    process.exit(1);
  }

  const chatId = Number(process.env.OUTPUT_CHAT_ID);
  await bot.init();

  // ✅ 模拟一个 update 和 ctx
  const fakeUpdate = {
    update_id: 999999,
    message: {
      message_id: 9999,
      from: {
        id: chatId,
        is_bot: false,
        first_name: "Local Shell",
      },
      chat: {
        id: chatId,
        type: "private" as const,
        first_name: "Local Shell",
      },
      date: Math.floor(Date.now() / 1000),
      text: "🧪 CLI 启动模拟",
    },
  };

  const ctx = new Context(fakeUpdate, bot.api, bot.botInfo); // ✅ 更真实的 ctx

  try {
    await ctx.reply("🔍 启动备份任务...");
    await mainBackUpMethod(ctx, startLink, endLink);
    await ctx.reply("✅ 本地任务完成！");
  } catch (e) {
    console.error("执行失败：", e);
    await ctx.reply(`❌ 任务失败：${(e as Error).message}`);
  }
}

run();
