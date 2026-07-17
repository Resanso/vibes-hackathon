import { Bot } from "grammy";

import { env } from "./env.js";
import { handleChatMessage } from "./handlers/chatHandler.js";
import { handleCheckInButton } from "./handlers/checkInButtons.js";
import { handleContactShared, handleStartCommand } from "./handlers/linking.js";
import { logger } from "./logger.js";

export function createBot(): Bot {
  const bot = new Bot(env.BOT_TOKEN);

  bot.command("start", handleStartCommand);
  bot.on("message:contact", handleContactShared);
  bot.on("callback_query:data", handleCheckInButton);

  // Everything else is free-text AI Coach — see chatHandler.ts. The old
  // /cek and /sudah fixed-command format is gone; the model figures out
  // intent (loan risk assessment, check-in, tracking status, alternatives)
  // via tool-calling on backend's side.
  bot.on("message:text", handleChatMessage);

  bot.catch((err) => {
    logger.error({ error: err.error, chatId: err.ctx.chat?.id }, "Unhandled bot error");
  });

  return bot;
}
