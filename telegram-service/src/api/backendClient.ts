import { createTRPCUntypedClient, httpLink } from "@trpc/client";
import superjson from "superjson";

import { env } from "../env.js";

// Untyped tRPC client — telegram-service and backend are separate npm
// projects (no shared workspace/package), so there's no AppRouter type to
// import across them. Call shapes here must be kept in sync with backend's
// routers by hand — same reasoning as whatsapp-service's backendClient.ts,
// which this mirrors.
const client = createTRPCUntypedClient({
  links: [
    httpLink({
      url: `${env.BACKEND_URL}/api/trpc`,
      transformer: superjson,
      headers: () => ({ "x-api-key": env.SHARED_API_KEY }),
    }),
  ],
});

export interface Profile {
  phone: string;
  notificationChannel: string;
  telegramChatId: string | null;
}

export interface DueReminder {
  phone: string;
  riskEntryId: string;
  installmentNumber: number;
  dueDate: string;
  monthlyInstallment: number;
}

export interface PendingCheckIn {
  phone: string;
  dailyTargetAmount: number;
}

export const backend = {
  // channel: "telegram" — filters to students whose notificationChannel is
  // Telegram, so whatsapp-service's own dueSoon call (channel: "whatsapp")
  // never double-sends the same reminder.
  dueSoon: (input: { withinDays: number }) =>
    client.query("reminders.dueSoon", { ...input, channel: "telegram" }) as Promise<
      DueReminder[]
    >,

  pendingCheckIns: () =>
    client.query("tracking.pendingToday", { channel: "telegram" }) as Promise<
      PendingCheckIn[]
    >,

  // Binds this Telegram chat to a phone's Profile — see
  // src/handlers/linking.ts's contact-share flow.
  linkTelegram: (input: { phone: string; telegramChatId: string }) =>
    client.mutation("profile.linkTelegram", input) as Promise<unknown>,

  // Reverse lookup — every message handler needs this first, since a
  // chatId alone carries no phone information (unlike a WhatsApp JID).
  getProfileByChatId: (telegramChatId: string) =>
    client.query("profile.getByTelegramChatId", { telegramChatId }) as Promise<Profile | null>,

  // Forward lookup — the reminder/check-in schedulers get a bare `phone`
  // back from dueSoon/pendingCheckIns and need telegramChatId to actually
  // send anything.
  getProfile: (phone: string) =>
    client.query("profile.get", { phone }) as Promise<Profile | null>,

  // Free-text AI Coach — see backend/src/server/ai/coachChat.ts. Replaces
  // this service's old direct risk.assess calls, which backend's
  // chat.message now performs internally via tool-calling.
  chatMessage: (input: { phone: string; message: string }) =>
    client.mutation("chat.message", input) as Promise<{ reply: string }>,

  // Direct check-in, bypassing the AI Coach — used by the check-in
  // reminder's inline "Sudah" button (src/reminders/checkInButtons.ts),
  // where a deterministic instant action is more appropriate than routing
  // a button tap through free-text tool-calling.
  checkIn: (phone: string) =>
    client.mutation("tracking.checkIn", { phone, source: "telegram" }) as Promise<unknown>,
};
