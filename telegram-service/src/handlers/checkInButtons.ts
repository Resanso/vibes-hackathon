import type { Context } from "grammy";

import { backend } from "../api/backendClient.js";
import { logger } from "../logger.js";
import { CHECKIN_DONE_DATA, CHECKIN_PENDING_DATA } from "../reminders/checkInScheduler.js";

// Handles taps on the check-in reminder's inline "Sudah"/"Belum" buttons
// (see reminders/checkInScheduler.ts). Calls tracking.checkIn directly
// instead of routing through the free-text AI Coach — a button tap is
// already an unambiguous, deterministic action, so there's nothing for the
// model to interpret.
export async function handleCheckInButton(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  const chatId = ctx.chat?.id;
  if (!data || chatId === undefined) return;

  if (data !== CHECKIN_DONE_DATA && data !== CHECKIN_PENDING_DATA) return;

  // chatId carries no phone information on its own — same reverse lookup
  // every other handler in this service does first (see CLAUDE.md's
  // "Identity: chatId → phone").
  const profile = await backend.getProfileByChatId(String(chatId));
  if (!profile) {
    await ctx.answerCallbackQuery({
      text: "Belum terhubung — kirim /start dulu ya.",
      show_alert: true,
    });
    return;
  }

  if (data === CHECKIN_DONE_DATA) {
    try {
      await backend.checkIn(profile.phone);
    } catch (error) {
      logger.error({ error, phone: profile.phone }, "Failed to record check-in from button tap");
      await ctx.answerCallbackQuery({
        text: "Gagal mencatat. Coba lagi lewat chat ya.",
        show_alert: true,
      });
      return;
    }

    await ctx.answerCallbackQuery({ text: "Sip, tercatat! 🎉" });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await ctx.reply("Sudah disisihkan hari ini. Mantap! 🎉");
    return;
  }

  // CHECKIN_PENDING_DATA — no tracking.checkIn call; "belum" just
  // acknowledges the reminder without recording a confirmation.
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup({ reply_markup: undefined });
  await ctx.reply(
    "Oke, jangan lupa disisihkan ya sebelum hari ini berakhir. Kalau belum sempat, hindari pinjam lagi cuma buat nutup cicilan ini.",
  );
}
