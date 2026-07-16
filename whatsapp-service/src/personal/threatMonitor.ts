import type { BaileysEventMap, WASocket } from "baileys";

import type { PrismaClient } from "../../generated/prisma/index.js";
import { logger } from "../connection.js";
import { detectThreat } from "../threat/detectThreat.js";

// Message handler for a linked student's personal WhatsApp session
// (connection.ts's startSession with sessionId = studentSessionId(phone)).
// Every inbound message is run through the threat-detection model; a
// "Threat" label gets saved as evidence FIRST, then the chat is archived —
// evidence has to land before the archive call so proof survives even though
// the chat disappears from the student's main inbox.
export function createThreatMonitorHandler(prisma: PrismaClient, linkedNumberId: string) {
  return async function handleIncomingMessage(
    sock: WASocket,
    event: BaileysEventMap["messages.upsert"],
  ): Promise<void> {
    for (const message of event.messages) {
      if (message.key.fromMe) continue;

      const jid = message.key.remoteJid;
      if (!jid) continue;

      const text =
        message.message?.conversation ?? message.message?.extendedTextMessage?.text ?? "";

      if (!text.trim()) continue;

      const { label, isThreat } = await detectThreat(text);
      if (!isThreat) continue;

      logger.warn({ linkedNumberId, jid, label }, "Threat detected, saving evidence and archiving chat");

      await prisma.threatEvidence.create({
        data: {
          linkedNumberId,
          fromJid: jid,
          messageText: text,
          label,
        },
      });

      try {
        await sock.chatModify({ archive: true, lastMessages: [message] }, jid);
        await prisma.threatEvidence.updateMany({
          where: { linkedNumberId, fromJid: jid, messageText: text },
          data: { chatArchived: true },
        });
      } catch (error) {
        logger.error({ error, linkedNumberId, jid }, "Failed to archive chat after threat detection");
      }
    }
  };
}
