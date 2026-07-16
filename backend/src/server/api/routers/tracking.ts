import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { apiKeyProcedure, createTRPCRouter } from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  computeDailyTarget,
  computeProgress,
  startOfDayUTC,
} from "~/server/logic/loanTracking";

// Shared by `start` and `status` so both ever return the exact same shape —
// mobile-app's client.ts types a single TrackingStatus for both.
async function loadStatusByPhone(phone: string) {
  const tracking = await db.loanTracking.findFirst({
    where: { phone },
    orderBy: { startedAt: "desc" },
    include: { riskEntry: true, checkIns: true },
  });
  if (!tracking) return null;

  const progress = computeProgress({
    dailyTargetAmount: tracking.dailyTargetAmount,
    totalRepayment: tracking.riskEntry.totalRepayment,
    checkInDates: tracking.checkIns.map((c) => c.date),
  });

  return {
    riskEntryId: tracking.riskEntryId,
    principal: tracking.riskEntry.principal,
    totalRepayment: tracking.riskEntry.totalRepayment,
    startedAt: tracking.startedAt,
    ...progress,
  };
}

export const trackingRouter = createTRPCRouter({
  // Marks a RiskEntry as an actually-taken loan (not just a simulation) and
  // starts daily payoff tracking for it. Idempotent — calling twice for the
  // same riskEntryId returns the existing tracking's status instead of
  // erroring.
  start: apiKeyProcedure
    .input(z.object({ riskEntryId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.loanTracking.findUnique({
        where: { riskEntryId: input.riskEntryId },
      });

      if (!existing) {
        const entry = await ctx.db.riskEntry.findUnique({
          where: { id: input.riskEntryId },
        });
        if (!entry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Risk entry tidak ditemukan." });
        }

        await ctx.db.loanTracking.create({
          data: {
            riskEntryId: entry.id,
            phone: entry.phone,
            dailyTargetAmount: computeDailyTarget(entry.monthlyInstallment),
          },
        });

        return loadStatusByPhone(entry.phone);
      }

      return loadStatusByPhone(existing.phone);
    }),

  // Records today's "sudah menyisihkan uang" confirmation for the caller's
  // most recently started tracking. Upserts on the (loanTrackingId, date)
  // unique constraint, so an app tap and a WhatsApp reply on the same day
  // don't double-count.
  checkIn: apiKeyProcedure
    .input(
      z.object({
        phone: z.string().min(1),
        source: z.enum(["app", "whatsapp", "telegram"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tracking = await ctx.db.loanTracking.findFirst({
        where: { phone: input.phone },
        orderBy: { startedAt: "desc" },
      });
      if (!tracking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Belum ada pinjaman yang di-track untuk nomor ini.",
        });
      }

      const date = startOfDayUTC(new Date());

      return ctx.db.dailyCheckIn.upsert({
        where: { loanTrackingId_date: { loanTrackingId: tracking.id, date } },
        create: { loanTrackingId: tracking.id, date, source: input.source },
        update: {},
      });
    }),

  // The caller's most recent active tracking + computed progress, or null
  // if nothing's being tracked yet.
  status: apiKeyProcedure
    .input(z.object({ phone: z.string().min(1) }))
    .query(({ input }) => loadStatusByPhone(input.phone)),

  // For each messaging service's evening cron: every active tracking whose
  // phone hasn't confirmed today yet AND whose Profile.notificationChannel
  // matches, so it knows who to remind/alert without double-sending across
  // both services.
  pendingToday: apiKeyProcedure
    .input(z.object({ channel: z.enum(["whatsapp", "telegram"]).default("whatsapp") }))
    .query(async ({ ctx, input }) => {
      const today = startOfDayUTC(new Date());

      const trackings = await ctx.db.loanTracking.findMany({
        where: { riskEntry: { profile: { notificationChannel: input.channel } } },
        include: { checkIns: { where: { date: today } } },
      });

      return trackings
        .filter((t) => t.checkIns.length === 0)
        .map((t) => ({
          phone: t.phone,
          dailyTargetAmount: t.dailyTargetAmount,
        }));
    }),
});
