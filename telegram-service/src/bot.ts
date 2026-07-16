import { Bot } from "grammy";

import { env } from "./env.js";
import { handleContactShared, handleStartCommand } from "./handlers/linking.js";
import { handleCekCommand, handleSudahCommand, handleUsage } from "./handlers/quickConsult.js";
import { logger } from "./logger.js";

export function createBot(): Bot {
  const bot = new Bot(env.BOT_TOKEN);

  bot.command("start", handleStartCommand);
  bot.on("message:contact", handleContactShared);
  bot.command("cek", handleCekCommand);
  bot.command("sudah", handleSudahCommand);

  // Fallback for any other text — same role as whatsapp-service's USAGE
  // reply for unrecognized messages.
  bot.on("message:text", handleUsage);

  bot.catch((err) => {
    logger.error({ error: err.error, chatId: err.ctx.chat?.id }, "Unhandled bot error");
  });

  return bot;
}
