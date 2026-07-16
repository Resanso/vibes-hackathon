import cron from "node-cron";
import type { WASocket } from "baileys";
import type { Logger } from "pino";

import { backend } from "../api/backendClient.js";
import { env } from "../env.js";
import { BOT_SESSION_ID, getActiveSocket, logger as defaultLogger } from "../connection.js";

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

// Randomized delay between sends — Baileys' own community reports document
// real ban/rate-limit risk in production when messages go out in a tight
// burst. Never send this loop's messages back-to-back with no delay.
function randomDelayMs(): number {
  return 1500 + Math.floor(Math.random() * 1500);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendDueReminders(
  sock: WASocket,
  logger: Logger,
): Promise<void> {
  const due = await backend.dueSoon({ withinDays: env.REMINDER_WINDOW_DAYS });

  logger.info({ count: due.length }, "Sending due-installment reminders");

  for (const reminder of due) {
    const jid = `${reminder.phone}@s.whatsapp.net`;
    const dueDate = new Date(reminder.dueDate).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
    });

    const text = [
      `Halo! Cicilan ke-${reminder.installmentNumber} kamu jatuh tempo ${dueDate}.`,
      `Jumlah: ${formatRupiah(reminder.monthlyInstallment)}.`,
      "Balas /cek kalau mau lihat ulang simulasi risikonya.",
    ].join("\n");

    try {
      await sock.sendMessage(jid, { text });
    } catch (error) {
      logger.error({ error, phone: reminder.phone }, "Failed to send reminder");
    }

    await sleep(randomDelayMs());
  }
}

// Registered exactly once at startup (see index.ts) — looks up whatever
// socket is currently active at run-time instead of closing over one
// instance, since reconnects in connection.ts replace it.
export function scheduleReminders(): void {
  cron.schedule(env.REMINDER_CRON, () => {
    const sock = getActiveSocket(BOT_SESSION_ID);
    if (!sock) {
      defaultLogger.warn("Skipping reminder run — no active WhatsApp connection");
      return;
    }

    void sendDueReminders(sock, defaultLogger).catch((error: unknown) => {
      defaultLogger.error({ error }, "Reminder run failed");
    });
  });

  defaultLogger.info({ cron: env.REMINDER_CRON }, "Reminder scheduler started");
}
