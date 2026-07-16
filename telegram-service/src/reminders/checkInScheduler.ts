import cron from "node-cron";
import type { Api } from "grammy";

import { backend } from "../api/backendClient.js";
import { env } from "../env.js";
import { logger as defaultLogger } from "../logger.js";

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// One evening run per day — mirrors whatsapp-service's
// checkInScheduler.ts's sendCheckInReminders exactly (same combined
// reminder + spiral-borrower education message, same scope cut to a single
// daily nudge instead of a morning/evening pair).
export async function sendCheckInReminders(
  api: Api,
  logger: typeof defaultLogger,
): Promise<number> {
  const pending = await backend.pendingCheckIns();

  logger.info({ count: pending.length }, "Sending daily check-in reminders (Telegram)");

  let sent = 0;
  for (const item of pending) {
    const profile = await backend.getProfile(item.phone);
    if (!profile?.telegramChatId) {
      logger.warn({ phone: item.phone }, "Check-in reminder skipped — no linked Telegram chat");
      continue;
    }

    const text = [
      "Halo! Udah nyisihkan uang buat cicilan hari ini?",
      `Target harian kamu: ${formatRupiah(item.dailyTargetAmount)}.`,
      "Kirim /sudah kalau sudah kamu sisihkan.",
      "",
      "Ingat: kalau belum sempat, jangan pinjam lagi cuma buat nutup cicilan ini — itu awal dari spiral utang yang susah keluar.",
    ].join("\n");

    try {
      await api.sendMessage(profile.telegramChatId, text);
      sent++;
    } catch (error) {
      logger.error({ error, phone: item.phone }, "Failed to send check-in reminder");
    }

    await sleep(200);
  }

  return sent;
}

export function scheduleCheckInReminders(api: Api): void {
  cron.schedule(env.CHECKIN_REMINDER_CRON, () => {
    void sendCheckInReminders(api, defaultLogger).catch((error: unknown) => {
      defaultLogger.error({ error }, "Check-in reminder run failed");
    });
  });

  defaultLogger.info(
    { cron: env.CHECKIN_REMINDER_CRON },
    "Check-in reminder scheduler started",
  );
}
