import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "~/env";
import { apiKeyProcedure, createTRPCRouter } from "~/server/api/trpc";
import { findDueInstallments } from "~/server/logic/reminders";
import { calculateRiskScore } from "~/server/logic/riskScore";
import { simulateLoan } from "~/server/logic/simulateLoan";

const channelSchema = z.enum(["whatsapp", "telegram"]);

// Which service's internal trigger server a channel routes to — see
// whatsapp-service/src/internal/triggerServer.ts and
// telegram-service/src/internal/triggerServer.ts (same shape, both
// localhost-only, never proxied by Nginx).
function serviceUrlFor(channel: "whatsapp" | "telegram"): string {
  return channel === "telegram" ? env.TELEGRAM_SERVICE_URL : env.WHATSAPP_SERVICE_URL;
}

export const remindersRouter = createTRPCRouter({
  // channel filters to students whose Profile.notificationChannel matches —
  // each messaging service only ever asks for its own channel's due
  // reminders, so switching a student's channel in mobile-app immediately
  // redirects future reminders without either service needing to know about
  // the other.
  dueSoon: apiKeyProcedure
    .input(
      z.object({
        withinDays: z.number().int().positive(),
        channel: channelSchema.default("whatsapp"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db.riskEntry.findMany({
        where: { profile: { notificationChannel: input.channel } },
        select: {
          id: true,
          phone: true,
          tenorMonths: true,
          monthlyInstallment: true,
          firstDueDate: true,
        },
      });

      return findDueInstallments(entries, input.withinDays);
    }),

  // Testing-only escape hatch: mobile-app calls this to fire an immediate
  // reminder run instead of waiting for the daily cron. Proxies to
  // whichever service's localhost-only internal trigger server matches
  // `channel` (same VPS either way).
  triggerNow: apiKeyProcedure
    .input(z.object({ channel: channelSchema.default("whatsapp") }))
    .mutation(async ({ input }) => {
      let response: Response;
      try {
        response = await fetch(`${serviceUrlFor(input.channel)}/trigger-reminders`, {
          method: "POST",
          headers: { "x-api-key": env.SHARED_API_KEY },
        });
      } catch {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: `${input.channel}-service tidak bisa dihubungi.`,
        });
      }

      if (!response.ok) {
        let errorMessage: string | undefined;
        try {
          const body = (await response.json()) as { error?: string };
          errorMessage = body.error;
        } catch {
          errorMessage = undefined;
        }

        throw new TRPCError({
          code: response.status === 503 ? "SERVICE_UNAVAILABLE" : "INTERNAL_SERVER_ERROR",
          message: errorMessage ?? "Gagal memicu reminder.",
        });
      }

      const result = (await response.json()) as { sent: number };
      return result;
    }),

  // Testing-only: creates a RiskEntry with firstDueDate set to tomorrow
  // instead of the usual +1 calendar month, so `dueSoon`/`triggerNow` find
  // it immediately with the *real* REMINDER_WINDOW_DAYS default (2) — no
  // need to widen that window just to test reminders end-to-end. Doesn't
  // touch risk-scoring realism (fixed placeholder loan terms); it exists
  // purely to produce a due date, not to simulate a specific scenario.
  debugCreateDueEntry: apiKeyProcedure
    .input(z.object({ phone: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.profile.findUnique({ where: { phone: input.phone } });
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Profil tidak ditemukan." });
      }

      const principal = 500_000;
      const interestRatePct = 12;
      const serviceFee = 0;
      const tenorMonths = 3;

      const simulation = simulateLoan({ principal, interestRatePct, serviceFee, tenorMonths });
      const risk = calculateRiskScore({
        monthlyIncome: profile.monthlyIncome,
        existingMonthlyDebt: profile.existingMonthlyDebt,
        monthlyInstallment: simulation.monthlyInstallment,
        tenorMonths,
      });

      const firstDueDate = new Date();
      firstDueDate.setDate(firstDueDate.getDate() + 1);

      const entry = await ctx.db.riskEntry.create({
        data: {
          phone: input.phone,
          principal,
          interestRatePct,
          serviceFee,
          tenorMonths,
          monthlyInstallment: simulation.monthlyInstallment,
          totalRepayment: simulation.totalRepayment,
          riskScore: risk.score,
          riskLabel: risk.label,
          explanation: "Entry debug untuk testing reminder — dibuat lewat tombol debug di app.",
          firstDueDate,
        },
      });

      return { id: entry.id, firstDueDate: entry.firstDueDate };
    }),
});
