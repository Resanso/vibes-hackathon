import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "~/env";
import { apiKeyProcedure, createTRPCRouter } from "~/server/api/trpc";
import { findDueInstallments } from "~/server/logic/reminders";

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
});
