import cron from "node-cron";
import type { WASocket } from "baileys";
import type { Logger } from "pino";

import { backend } from "../api/backendClient.js";
import { env } from "../env.js";
import { BOT_SESSION_ID, getActiveSocket, logger as defaultLogger } from "../connection.js";

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

// Randomized delay between sends — same ban/rate-limit reasoning as
// scheduler.ts's sendDueReminders.
function randomDelayMs(): number {
  return 1500 + Math.floor(Math.random() * 1500);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// One evening run per day: reminds every active "State 2" loan-tracking
// phone that hasn't confirmed today, combining the reminder and the
// spiral-borrower education into a single message — a scope-cut from a
// two-step morning-reminder/evening-escalation design, since
// whatsapp-service is this product's lowest-priority surface (see root
// CLAUDE.md's MVP priority order).
export async function sendCheckInReminders(sock: WASocket, logger: Logger): Promise<number> {
  const pending = await backend.pendingCheckIns();

  logger.info({ count: pending.length }, "Sending daily check-in reminders");

  for (const item of pending) {
    const jid = `${item.phone}@s.whatsapp.net`;

    const text = [
      "Halo! Udah nyisihkan uang buat cicilan hari ini?",
      `Target harian kamu: ${formatRupiah(item.dailyTargetAmount)}.`,
      "Balas */sudah* kalau sudah kamu sisihkan.",
      "",
      "Ingat: kalau belum sempat, jangan pinjam lagi cuma buat nutup cicilan ini — itu awal dari spiral utang yang susah keluar.",
    ].join("\n");

    try {
      await sock.sendMessage(jid, { text });
    } catch (error) {
      logger.error({ error, phone: item.phone }, "Failed to send check-in reminder");
    }

    await sleep(randomDelayMs());
  }

  return pending.length;
}

// Registered exactly once at startup (see index.ts) — looks up whatever
// socket is currently active at run-time, same reasoning as
// scheduler.ts's scheduleReminders.
export function scheduleCheckInReminders(): void {
  cron.schedule(env.CHECKIN_REMINDER_CRON, () => {
    const sock = getActiveSocket(BOT_SESSION_ID);
    if (!sock) {
      defaultLogger.warn("Skipping check-in reminder run — no active WhatsApp connection");
      return;
    }

    void sendCheckInReminders(sock, defaultLogger).catch((error: unknown) => {
      defaultLogger.error({ error }, "Check-in reminder run failed");
    });
  });

  defaultLogger.info(
    { cron: env.CHECKIN_REMINDER_CRON },
    "Check-in reminder scheduler started",
  );
}
