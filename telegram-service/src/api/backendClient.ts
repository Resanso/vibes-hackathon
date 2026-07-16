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

export interface RiskAssessResult {
  riskScore: number;
  riskLabel: "aman" | "waspada" | "bahaya";
  reasons: string[];
  explanation: string | null;
  monthlyInstallment: number;
  totalRepayment: number;
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

export interface TrackingStatus {
  riskEntryId: string;
  principal: number;
  totalRepayment: number;
  startedAt: string;
  dailyTargetAmount: number;
  daysConfirmed: number;
  amountSaved: number;
  remainingAmount: number;
  confirmedToday: boolean;
}

export const backend = {
  assessRisk: (input: {
    phone: string;
    principal: number;
    interestRatePct: number;
    serviceFee: number;
    tenorMonths: number;
  }) => client.mutation("risk.assess", input) as Promise<RiskAssessResult>,

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

  checkIn: (input: { phone: string; source: "app" | "whatsapp" | "telegram" }) =>
    client.mutation("tracking.checkIn", input) as Promise<unknown>,

  trackingStatus: (phone: string) =>
    client.query("tracking.status", { phone }) as Promise<TrackingStatus | null>,

  // Binds this Telegram chat to a phone's Profile — see
  // src/handlers/linking.ts's contact-share flow.
  linkTelegram: (input: { phone: string; telegramChatId: string }) =>
    client.mutation("profile.linkTelegram", input) as Promise<unknown>,

  // Reverse lookup — every command handler needs this first, since a
  // chatId alone carries no phone information (unlike a WhatsApp JID).
  getProfileByChatId: (telegramChatId: string) =>
    client.query("profile.getByTelegramChatId", { telegramChatId }) as Promise<Profile | null>,

  // Forward lookup — the reminder/check-in schedulers get a bare `phone`
  // back from dueSoon/pendingCheckIns and need telegramChatId to actually
  // send anything.
  getProfile: (phone: string) =>
    client.query("profile.get", { phone }) as Promise<Profile | null>,
};
