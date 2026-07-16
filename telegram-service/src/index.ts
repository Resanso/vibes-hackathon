import "dotenv/config";

import { createBot } from "./bot.js";
import { logger } from "./logger.js";
import { startTriggerServer } from "./internal/triggerServer.js";
import { scheduleCheckInReminders } from "./reminders/checkInScheduler.js";
import { scheduleReminders } from "./reminders/scheduler.js";

async function main(): Promise<void> {
  const bot = createBot();

  scheduleReminders(bot.api);
  scheduleCheckInReminders(bot.api);
  startTriggerServer(bot.api);

  await bot.start({
    onStart: () => {
      logger.info("telegram-service started (long polling)");
    },
  });
}

main().catch((error: unknown) => {
  logger.error({ error }, "Fatal error starting telegram-service");
  process.exit(1);
});
