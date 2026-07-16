import {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeWASocket,
  type BaileysEventMap,
  type WASocket,
} from "baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";

import type { PrismaClient } from "../generated/prisma/index.js";
import { useDbAuthState } from "./auth/dbAuthState.js";

export const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

// The Nera bot's own session id — reminders + quick consult run on this one.
// Personal numbers linked for teror-detection monitoring use
// `student:<phone>` instead (see src/personal/linkPersonalNumber.ts).
export const BOT_SESSION_ID = "bot";

export interface SessionHandlers {
  onMessages?: (
    sock: WASocket,
    event: BaileysEventMap["messages.upsert"],
  ) => void | Promise<void>;
  onConnected?: (sock: WASocket) => void | Promise<void>;
  onLoggedOut?: () => void | Promise<void>;
}

// This service runs more than one Baileys connection at once (the bot, plus
// one per linked student), so the "currently active socket" lookup the
// reminder scheduler needs has to be keyed by session id — reconnects replace
// a session's socket instance, so callers must look this up at send-time
// rather than holding a reference forever.
const activeSockets = new Map<string, WASocket>();

export function getActiveSocket(sessionId: string): WASocket | null {
  return activeSockets.get(sessionId) ?? null;
}

// Recreates the socket on every reconnect-worthy disconnect — this also
// covers DisconnectReason.restartRequired (fires right after a QR scan),
// which per Baileys' current docs needs a fresh socket instance rather than
// a bare reconnect call on the old one.
export async function startSession(
  prisma: PrismaClient,
  sessionId: string,
  handlers: SessionHandlers = {},
): Promise<void> {
  const { state, saveCreds } = await useDbAuthState(prisma, sessionId);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    version,
    logger,
  });

  activeSockets.set(sessionId, sock);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info({ sessionId }, "Scan this QR code with WhatsApp (Linked Devices) to log in:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const statusCode = (
        lastDisconnect?.error as { output?: { statusCode?: number } }
      )?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      logger.warn({ sessionId, statusCode, shouldReconnect }, "WhatsApp connection closed");

      if (shouldReconnect) {
        void startSession(prisma, sessionId, handlers);
      } else {
        activeSockets.delete(sessionId);
        logger.error(
          { sessionId },
          "Logged out — stored session is no longer valid, delete its WhatsappCreds/WhatsappSignalKey rows and re-pair with a new QR scan.",
        );
        void handlers.onLoggedOut?.();
      }
    } else if (connection === "open") {
      logger.info({ sessionId }, "WhatsApp connection established");
      void handlers.onConnected?.(sock);
    }
  });

  if (handlers.onMessages) {
    const onMessages = handlers.onMessages;
    sock.ev.on("messages.upsert", (event) => {
      void Promise.resolve(onMessages(sock, event)).catch((error: unknown) => {
        logger.error({ sessionId, error }, "Failed to handle incoming message");
      });
    });
  }
}
