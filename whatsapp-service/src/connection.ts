import {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeWASocket,
  type WASocket,
} from "baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";

import type { PrismaClient } from "../generated/prisma/index.js";
import { useDbAuthState } from "./auth/dbAuthState.js";
import { handleIncomingMessage } from "./handlers/quickConsult.js";

export const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

let activeSock: WASocket | null = null;

// The reminder scheduler needs "whatever socket is currently connected" —
// reconnects replace the socket instance, so callers must look this up at
// send-time rather than holding a reference to one socket forever.
export function getActiveSocket(): WASocket | null {
  return activeSock;
}

// Recreates the socket on every reconnect-worthy disconnect — this also
// covers DisconnectReason.restartRequired (fires right after a QR scan),
// which per Baileys' current docs needs a fresh socket instance rather than
// a bare reconnect call on the old one.
export async function startConnection(prisma: PrismaClient): Promise<void> {
  const { state, saveCreds } = await useDbAuthState(prisma);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    version,
    logger,
  });

  activeSock = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info("Scan this QR code with WhatsApp (Linked Devices) to log in:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const statusCode = (
        lastDisconnect?.error as { output?: { statusCode?: number } }
      )?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      logger.warn({ statusCode, shouldReconnect }, "WhatsApp connection closed");

      if (shouldReconnect) {
        void startConnection(prisma);
      } else {
        activeSock = null;
        logger.error(
          "Logged out — stored session is no longer valid, delete WhatsappCreds/WhatsappSignalKey rows and re-pair with a new QR scan.",
        );
      }
    } else if (connection === "open") {
      logger.info("WhatsApp connection established");
    }
  });

  sock.ev.on("messages.upsert", (event) => {
    void handleIncomingMessage(sock, event).catch((error: unknown) => {
      logger.error({ error }, "Failed to handle incoming message");
    });
  });
}
