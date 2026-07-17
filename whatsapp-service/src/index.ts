import "dotenv/config";

import { PrismaClient } from "../generated/prisma/index.js";
import { BOT_SESSION_ID, logger, startSession } from "./connection.js";
import { handleIncomingMessage } from "./handlers/chatHandler.js";
import { startTriggerServer } from "./internal/triggerServer.js";
import { linkPersonalNumber } from "./personal/linkPersonalNumber.js";
import { listActiveLinkedNumbers } from "./personal/linkedNumbers.js";
import { scheduleReminders } from "./reminders/scheduler.js";
import { scheduleCheckInReminders } from "./reminders/checkInScheduler.js";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await startSession(prisma, BOT_SESSION_ID, {
    onMessages: handleIncomingMessage,
  });
  scheduleReminders();
  scheduleCheckInReminders();
  startTriggerServer();

  // Reconnect every previously-linked student number — pairing itself
  // (the QR scan) only ever happens once, via `npm run link:number`, but the
  // session needs to be re-established on every process restart/redeploy.
  const linkedNumbers = await listActiveLinkedNumbers(prisma);
  for (const linked of linkedNumbers) {
    void linkPersonalNumber(prisma, linked.phone).catch((error: unknown) => {
      logger.error({ error, phone: linked.phone }, "Failed to resume linked-number session");
    });
  }

  logger.info({ resumedLinkedNumbers: linkedNumbers.length }, "whatsapp-service started");
}

main().catch((error: unknown) => {
  logger.error({ error }, "Fatal error starting whatsapp-service");
  process.exit(1);
});
