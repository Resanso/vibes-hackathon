import { TRPCClientError } from "@trpc/client";
import { Keyboard, type Context } from "grammy";

import { backend } from "../api/backendClient.js";
import { logger } from "../logger.js";

const CONTACT_KEYBOARD = new Keyboard()
  .requestContact("📱 Bagikan nomor telepon saya")
  .resized()
  .oneTime();

export async function handleStartCommand(ctx: Context): Promise<void> {
  await ctx.reply(
    [
      "Halo! Aku Nera — asisten keuangan kamu di Telegram.",
      "",
      "Supaya aku bisa kirim reminder cicilan & jawab /cek di sini, bagikan nomor telepon yang SAMA PERSIS dengan yang kamu daftarkan di aplikasi Nera (tombol di bawah).",
    ].join("\n"),
    { reply_markup: CONTACT_KEYBOARD },
  );
}

// Telegram's contact.phone_number arrives as international-format digits,
// usually without a leading "+" (e.g. "6281234567890"). mobile-app's
// Onboarding screen does NOT normalize what a student types into its phone
// field, though (see mobile-app/src/screens/Onboarding.tsx — raw string
// goes straight to Profile.phone) — the same gap already exists for
// whatsapp-service's JID-based matching. Stripping non-digits here is the
// same level of rigor already accepted there, not a new gap.
function normalizePhone(rawPhone: string): string {
  return rawPhone.replace(/\D/g, "");
}

export async function handleContactShared(ctx: Context): Promise<void> {
  const contact = ctx.message?.contact;
  const chatId = ctx.chat?.id;
  if (!contact || chatId === undefined) return;

  const phone = normalizePhone(contact.phone_number);

  try {
    await backend.linkTelegram({ phone, telegramChatId: chatId.toString() });
    await ctx.reply(
      [
        "Berhasil terhubung! 🎉",
        "",
        "Reminder & /cek kamu masih lewat WhatsApp secara default — buka tab Profil di aplikasi Nera untuk beralih ke Telegram kapan saja.",
      ].join("\n"),
      { reply_markup: { remove_keyboard: true } },
    );
  } catch (error) {
    const isNotFound = error instanceof TRPCClientError && error.data?.code === "NOT_FOUND";
    logger.warn({ error, phone }, "Failed to link Telegram chat");
    await ctx.reply(
      isNotFound
        ? "Nomor ini belum punya profil di aplikasi Nera. Isi dulu Financial Survival Check di app, baru bagikan nomor lagi di sini."
        : "Gagal menghubungkan akun. Coba lagi sebentar lagi.",
      { reply_markup: { remove_keyboard: true } },
    );
  }
}
