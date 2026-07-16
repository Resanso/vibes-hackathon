import type { BaileysEventMap, WASocket } from "baileys";
import { TRPCClientError } from "@trpc/client";

import { backend } from "../api/backendClient.js";

const USAGE = [
  "Format: /cek <nominal> <bunga%/tahun> <biaya> <tenor bulan>",
  "Contoh: /cek 3000000 24 50000 6",
  "(Pastikan kamu sudah punya profil di aplikasi Nera dulu.)",
  "",
  "Lagi nge-track pelunasan pinjaman? Balas /sudah kalau hari ini sudah nyisihkan uang.",
].join("\n");

function jidToPhone(jid: string): string {
  return jid.split("@")[0] ?? jid;
}

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

async function handleCheckInCommand(sock: WASocket, jid: string, phone: string): Promise<void> {
  try {
    await backend.checkIn({ phone, source: "whatsapp" });
    const status = await backend.trackingStatus(phone);

    if (!status) {
      await sock.sendMessage(jid, {
        text: "Belum ada pinjaman yang di-track. Tandai pinjamanmu di aplikasi Nera dulu.",
      });
      return;
    }

    const reply = [
      "Sip, tercatat! 🎉",
      `Sisa tunggakan: ${formatRupiah(status.remainingAmount)}`,
      `Total hari disisihkan: ${status.daysConfirmed} hari`,
    ].join("\n");

    await sock.sendMessage(jid, { text: reply });
  } catch (error) {
    const isNotFound = error instanceof TRPCClientError && error.data?.code === "NOT_FOUND";
    const message = isNotFound
      ? "Belum ada pinjaman yang di-track. Tandai pinjamanmu di aplikasi Nera dulu."
      : "Gagal memproses konfirmasi. Coba lagi sebentar lagi.";
    await sock.sendMessage(jid, { text: message });
  }
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

export async function handleIncomingMessage(
  sock: WASocket,
  event: BaileysEventMap["messages.upsert"],
): Promise<void> {
  for (const message of event.messages) {
    if (message.key.fromMe) continue;

    const jid = message.key.remoteJid;
    if (!jid) continue;

    const text =
      message.message?.conversation ??
      message.message?.extendedTextMessage?.text ??
      "";
    const trimmed = text.trim();

    if (trimmed === "/sudah") {
      await handleCheckInCommand(sock, jid, jidToPhone(jid));
      continue;
    }

    if (!trimmed.startsWith("/cek")) {
      if (trimmed.length > 0) {
        await sock.sendMessage(jid, { text: USAGE });
      }
      continue;
    }

    const parsed = parseCekCommand(text);
    if (!parsed) {
      await sock.sendMessage(jid, { text: USAGE });
      continue;
    }

    const phone = jidToPhone(jid);

    try {
      const risk = await backend.assessRisk({ phone, ...parsed });

      const reply = [
        `Status risiko: *${risk.riskLabel.toUpperCase()}* (skor ${risk.riskScore}/100)`,
        `Cicilan per bulan: ${formatRupiah(risk.monthlyInstallment)}`,
        `Total yang harus dibayar: ${formatRupiah(risk.totalRepayment)}`,
        "",
        risk.explanation ?? risk.reasons.join(" "),
      ].join("\n");

      await sock.sendMessage(jid, { text: reply });
    } catch (error) {
      const isNotFound =
        error instanceof TRPCClientError && error.data?.code === "NOT_FOUND";
      const message = isNotFound
        ? "Profil kamu belum terdaftar. Isi dulu data di aplikasi Nera sebelum /cek di WhatsApp."
        : "Gagal memproses permintaan. Coba lagi sebentar lagi.";
      await sock.sendMessage(jid, { text: message });
    }
  }
}
