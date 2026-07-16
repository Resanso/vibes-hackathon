import { TRPCClientError } from "@trpc/client";
import type { Context } from "grammy";

import { backend } from "../api/backendClient.js";

const USAGE = [
  "Format: /cek <nominal> <bunga%/tahun> <biaya> <tenor bulan>",
  "Contoh: /cek 3000000 24 50000 6",
  "(Pastikan kamu sudah share nomor telepon lewat /start dulu.)",
  "",
  "Lagi nge-track pelunasan pinjaman? Kirim /sudah kalau hari ini sudah nyisihkan uang.",
].join("\n");

const NOT_LINKED_MESSAGE =
  "Kamu belum terhubung. Kirim /start dan bagikan nomor telepon yang sama dengan yang kamu daftarkan di aplikasi Nera dulu.";

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

// Every command needs the phone behind this chat first — unlike a WhatsApp
// JID (which IS the phone number), a Telegram chatId carries no phone
// information until /start's contact-share flow binds one (see
// handlers/linking.ts).
async function resolvePhone(chatId: number): Promise<string | null> {
  const profile = await backend.getProfileByChatId(chatId.toString());
  return profile?.phone ?? null;
}

function parseCekCommand(text: string): {
  principal: number;
  interestRatePct: number;
  serviceFee: number;
  tenorMonths: number;
} | null {
  const parts = text.trim().split(/\s+/);
  if (parts.length !== 5 || parts[0] !== "/cek") return null;

  const [, principalStr, interestStr, feeStr, tenorStr] = parts;
  const principal = Number(principalStr);
  const interestRatePct = Number(interestStr);
  const serviceFee = Number(feeStr);
  const tenorMonths = Number(tenorStr);

  if (
    !Number.isFinite(principal) ||
    !Number.isFinite(interestRatePct) ||
    !Number.isFinite(serviceFee) ||
    !Number.isFinite(tenorMonths) ||
    principal <= 0 ||
    tenorMonths <= 0
  ) {
    return null;
  }

  return { principal, interestRatePct, serviceFee, tenorMonths };
}

export async function handleUsage(ctx: Context): Promise<void> {
  await ctx.reply(USAGE);
}

export async function handleCekCommand(ctx: Context): Promise<void> {
  const text = ctx.message?.text ?? "";
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

  const parsed = parseCekCommand(text);
  if (!parsed) {
    await ctx.reply(USAGE);
    return;
  }

  const phone = await resolvePhone(chatId);
  if (!phone) {
    await ctx.reply(NOT_LINKED_MESSAGE);
    return;
  }

  try {
    const risk = await backend.assessRisk({ phone, ...parsed });

    const reply = [
      `Status risiko: *${risk.riskLabel.toUpperCase()}* (skor ${risk.riskScore}/100)`,
      `Cicilan per bulan: ${formatRupiah(risk.monthlyInstallment)}`,
      `Total yang harus dibayar: ${formatRupiah(risk.totalRepayment)}`,
      "",
      risk.explanation ?? risk.reasons.join(" "),
    ].join("\n");

    await ctx.reply(reply);
  } catch (error) {
    const isNotFound = error instanceof TRPCClientError && error.data?.code === "NOT_FOUND";
    await ctx.reply(
      isNotFound
        ? "Profil kamu belum terdaftar. Isi dulu data di aplikasi Nera sebelum /cek di Telegram."
        : "Gagal memproses permintaan. Coba lagi sebentar lagi.",
    );
  }
}

export async function handleSudahCommand(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

  const phone = await resolvePhone(chatId);
  if (!phone) {
    await ctx.reply(NOT_LINKED_MESSAGE);
    return;
  }

  try {
    await backend.checkIn({ phone, source: "telegram" });
    const status = await backend.trackingStatus(phone);

    if (!status) {
      await ctx.reply("Belum ada pinjaman yang di-track. Tandai pinjamanmu di aplikasi Nera dulu.");
      return;
    }

    const reply = [
      "Sip, tercatat! 🎉",
      `Sisa tunggakan: ${formatRupiah(status.remainingAmount)}`,
      `Total hari disisihkan: ${status.daysConfirmed} hari`,
    ].join("\n");

    await ctx.reply(reply);
  } catch (error) {
    const isNotFound = error instanceof TRPCClientError && error.data?.code === "NOT_FOUND";
    await ctx.reply(
      isNotFound
        ? "Belum ada pinjaman yang di-track. Tandai pinjamanmu di aplikasi Nera dulu."
        : "Gagal memproses konfirmasi. Coba lagi sebentar lagi.",
    );
  }
}
