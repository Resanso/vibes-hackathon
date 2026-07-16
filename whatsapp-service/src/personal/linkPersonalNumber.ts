import type { PrismaClient } from "../../generated/prisma/index.js";
import { startSession } from "../connection.js";
import { setLinkedNumberStatus, studentSessionId, upsertLinkedNumber } from "./linkedNumbers.js";
import { createThreatMonitorHandler } from "./threatMonitor.js";

// Starts (or resumes) the Baileys session for one student's personal
// WhatsApp number. Called both from the one-time pairing CLI script
// (src/scripts/linkNumber.ts) and from index.ts on boot, to reconnect every
// previously-linked number — upsertLinkedNumber is idempotent either way.
export async function linkPersonalNumber(prisma: PrismaClient, phone: string): Promise<void> {
  const linkedNumber = await upsertLinkedNumber(prisma, phone);

  await startSession(prisma, studentSessionId(phone), {
    onMessages: createThreatMonitorHandler(prisma, linkedNumber.id),
    onConnected: async () => {
      await setLinkedNumberStatus(prisma, phone, "connected");
    },
    onLoggedOut: async () => {
      await setLinkedNumberStatus(prisma, phone, "logged_out");
    },
  });
}
