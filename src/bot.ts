import dotenv from "dotenv";
import { SocksProxyAgent } from "socks-proxy-agent";
dotenv.config();

import { Bot } from "grammy";

import { forwardHistory } from "./handlers/forwardText";
import { autoForward } from "./handlers/autoforward";
import { forwardLinkMessage } from "./handlers/forwardLinkMessage";
import { registerCopyAlbum } from "./handlers/copy_album";
import { registerCopyFileGroup } from "./handlers/copyFileGroup";
import { registerCopyReplyGroup } from "./handlers/copyReplyGroup";
import { registerBackupMethod } from "./handlers/mainBackupMethod";

let baseFetchConfig : any = {compress: true}

if (process.env.Agent) {
  const socksAgent = new SocksProxyAgent("socks://127.0.0.1:7897");
  baseFetchConfig = {
    agent: socksAgent,
    compress: true,
  }
}



// Create an instance of the `Bot` class and pass your bot token to it.
const bot = new Bot(process.env.BOT_TOKEN!, {
  client: {
    baseFetchConfig: baseFetchConfig,
  },
}); // <-- put your bot token between the ""

// You can now register listeners on your bot object `bot`.
// grammY will call the listeners when users send messages to your bot.

// Handle the /start command.
bot.command("start", (ctx) => ctx.reply("Welcome! Up and running."));
// Handle other messages. if open this it will handle all messages
// bot.on("message", (ctx) => ctx.reply("Got another message!"));

// register handlers
forwardHistory(bot);
forwardLinkMessage(bot);
registerCopyAlbum(bot);
registerCopyFileGroup(bot);
registerCopyReplyGroup(bot);
registerBackupMethod(bot);
// autoForward(bot);

const fs = require("fs-extra");

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
  fs.appendFile("error-log.txt", logMessage, (fileErr) => {
    if (fileErr) {
      console.error("Error writing to log file:", fileErr);
    } else {
      console.log("Logged error to error-log.txt");
    }
  });
});

// Start the bot.
bot.start();

export default bot;
