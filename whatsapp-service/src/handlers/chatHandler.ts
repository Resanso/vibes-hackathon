import type { BaileysEventMap, WASocket } from "baileys";
import { TRPCClientError } from "@trpc/client";

import { backend } from "../api/backendClient.js";

// Free-text AI Coach — replaces the old fixed /cek <nominal> <bunga> <biaya>
// <tenor> command format entirely. Any message body is forwarded as-is to
// backend's chat.message, which does the natural-language understanding
// (tool-calling for loan risk assessment / check-in / tracking / campus
// alternatives) and keeps multi-turn conversation history per phone. See
// backend/src/server/ai/coachChat.ts.
export async function handleIncomingMessage(
  sock: WASocket,
  event: BaileysEventMap["messages.upsert"],
): Promise<void> {
  for (const message of event.messages) {
    if (message.key.fromMe) continue;

    const jid = message.key.remoteJid;
    if (!jid) continue;

    const text =
      message.message?.conversation ?? message.message?.extendedTextMessage?.text ?? "";
    const trimmed = text.trim();
    if (!trimmed) continue;

    const phone = jid.split("@")[0] ?? jid;

    try {
      const { reply } = await backend.chatMessage({ phone, message: trimmed });
      await sock.sendMessage(jid, { text: reply });
    } catch (error) {
      const isNotFound = error instanceof TRPCClientError && error.data?.code === "NOT_FOUND";
      const replyText = isNotFound
        ? "Profil kamu belum terdaftar. Isi dulu data di aplikasi Nera dulu, ya."
        : "Gagal memproses pesanmu. Coba lagi sebentar lagi.";
      await sock.sendMessage(jid, { text: replyText });
    }
  }
}
