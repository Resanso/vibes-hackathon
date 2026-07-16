import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "~/env";
import { apiKeyProcedure, createTRPCRouter } from "~/server/api/trpc";
import { findDueInstallments } from "~/server/logic/reminders";

export const remindersRouter = createTRPCRouter({
  dueSoon: apiKeyProcedure
    .input(z.object({ withinDays: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db.riskEntry.findMany({
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
  // reminder run instead of waiting for whatsapp-service's daily cron.
  // Proxies to whatsapp-service's localhost-only internal trigger server
  // (same VPS) — see whatsapp-service/src/internal/triggerServer.ts.
  triggerNow: apiKeyProcedure.mutation(async () => {
    let response: Response;
    try {
      response = await fetch(`${env.WHATSAPP_SERVICE_URL}/trigger-reminders`, {
        method: "POST",
        headers: { "x-api-key": env.SHARED_API_KEY },
      });
    } catch {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "whatsapp-service tidak bisa dihubungi.",
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
