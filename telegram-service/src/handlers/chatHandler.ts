import { TRPCClientError } from "@trpc/client";
import type { Context } from "grammy";

import { backend } from "../api/backendClient.js";

const NOT_LINKED_MESSAGE =
  "Kamu belum terhubung. Kirim /start dan bagikan nomor telepon yang sama dengan yang kamu daftarkan di aplikasi Nera dulu.";

// Free-text AI Coach — replaces the old /cek and /sudah fixed-command
// format entirely. Any message is forwarded as-is to backend's chat.message
// (natural-language understanding + tool-calling + multi-turn history, see
// backend/src/server/ai/coachChat.ts). A chatId still has to resolve to a
// phone first (see linking.ts) since unlike a WhatsApp JID it carries no
// phone information on its own.
export async function handleChatMessage(ctx: Context): Promise<void> {
  const text = ctx.message?.text;
  const chatId = ctx.chat?.id;
  if (!text || chatId === undefined) return;

  const profile = await backend.getProfileByChatId(chatId.toString());
  if (!profile) {
    await ctx.reply(NOT_LINKED_MESSAGE);
    return;
  }

  try {
    const { reply } = await backend.chatMessage({ phone: profile.phone, message: text });
    await ctx.reply(reply);
  } catch (error) {
    const isNotFound = error instanceof TRPCClientError && error.data?.code === "NOT_FOUND";
    await ctx.reply(
      isNotFound
        ? "Profil kamu belum lengkap. Isi dulu data di aplikasi Nera dulu, ya."
        : "Gagal memproses pesanmu. Coba lagi sebentar lagi.",
    );
  }
}
