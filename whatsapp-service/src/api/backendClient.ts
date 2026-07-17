import { createTRPCUntypedClient, httpLink } from "@trpc/client";
import superjson from "superjson";

import { env } from "../env.js";

// Untyped tRPC client — whatsapp-service and backend are separate npm
// projects (no shared workspace/package), so there's no AppRouter type to
// import across them. Call shapes here must be kept in sync with backend's
// routers by hand.
const client = createTRPCUntypedClient({
  links: [
    httpLink({
      url: `${env.BACKEND_URL}/api/trpc`,
      transformer: superjson,
      headers: () => ({ "x-api-key": env.SHARED_API_KEY }),
    }),
  ],
});

export interface DueReminder {
  phone: string;
  riskEntryId: string;
  installmentNumber: number;
  dueDate: string;
  monthlyInstallment: number;
}

// "State 2" tracking — see backend/src/server/api/routers/tracking.ts.
export interface PendingCheckIn {
  phone: string;
  dailyTargetAmount: number;
}

export const backend = {
  dueSoon: (input: { withinDays: number }) =>
    client.query("reminders.dueSoon", input) as Promise<DueReminder[]>,

  pendingCheckIns: () =>
    client.query("tracking.pendingToday", undefined) as Promise<PendingCheckIn[]>,

  // Free-text AI Coach — see backend/src/server/ai/coachChat.ts. Replaces
  // this service's old direct risk.assess/tracking.checkIn calls, which
  // backend's chat.message now performs internally via tool-calling.
  chatMessage: (input: { phone: string; message: string }) =>
    client.mutation("chat.message", input) as Promise<{ reply: string }>,
};
