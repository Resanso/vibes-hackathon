import cron from "node-cron";
import type { Api } from "grammy";

import { backend } from "../api/backendClient.js";
import { env } from "../env.js";
import { logger as defaultLogger } from "../logger.js";

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

// No ban/rate-limit concern here the way whatsapp-service's Baileys sends
// have (Telegram Bot API is an officially sanctioned integration, not an
// unofficial multi-device client) — Telegram does apply its own per-chat
// rate limits (~30 msg/sec across all chats), so a small delay is still
// cheap insurance against bursts, not a strict requirement like Baileys'.
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendDueReminders(
  api: Api,
  logger: typeof defaultLogger,
): Promise<number> {
  const due = await backend.dueSoon({ withinDays: env.REMINDER_WINDOW_DAYS });

  logger.info({ count: due.length }, "Sending due-installment reminders (Telegram)");

  let sent = 0;
  for (const reminder of due) {
    const profile = await backend.getProfile(reminder.phone);
    if (!profile?.telegramChatId) {
      logger.warn({ phone: reminder.phone }, "Due reminder skipped — no linked Telegram chat");
      continue;
    }

    const dueDate = new Date(reminder.dueDate).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
    });

    const text = [
      `Halo! Cicilan ke-${reminder.installmentNumber} kamu jatuh tempo ${dueDate}.`,
      `Jumlah: ${formatRupiah(reminder.monthlyInstallment)}.`,
      "Kirim /cek kalau mau lihat ulang simulasi risikonya.",
    ].join("\n");

    try {
      await api.sendMessage(profile.telegramChatId, text);
      sent++;
    } catch (error) {
      logger.error({ error, phone: reminder.phone }, "Failed to send reminder");
    }

    await sleep(200);
  }

  return sent;
}

// Registered once at startup (see index.ts).
export function scheduleReminders(api: Api): void {
  cron.schedule(env.REMINDER_CRON, () => {
    void sendDueReminders(api, defaultLogger).catch((error: unknown) => {
      defaultLogger.error({ error }, "Reminder run failed");
    });
  });

  defaultLogger.info({ cron: env.REMINDER_CRON }, "Reminder scheduler started");
}
