import "dotenv/config";

import { PrismaClient } from "../generated/prisma/index.js";
import { logger, startConnection } from "./connection.js";
import { scheduleReminders } from "./reminders/scheduler.js";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await startConnection(prisma);
  scheduleReminders();
  logger.info("whatsapp-service started");
}

main().catch((error: unknown) => {
  logger.error({ error }, "Fatal error starting whatsapp-service");
  process.exit(1);
});
