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

export interface SimulateLoanResult {
  totalInterest: number;
  totalRepayment: number;
  monthlyInstallment: number;
  latePaymentProjection: { monthsLate: number; lateFee: number; totalOwed: number }[];
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

export const backend = {
  simulateLoan: (input: {
    principal: number;
    interestRatePct: number;
    serviceFee: number;
    tenorMonths: number;
  }) => client.query("simulation.calculate", input) as Promise<SimulateLoanResult>,

  assessRisk: (input: {
    phone: string;
    principal: number;
    interestRatePct: number;
    serviceFee: number;
    tenorMonths: number;
  }) => client.mutation("risk.assess", input) as Promise<RiskAssessResult>,

  dueSoon: (input: { withinDays: number }) =>
    client.query("reminders.dueSoon", input) as Promise<DueReminder[]>,
};
