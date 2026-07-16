import { z } from "zod";

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
});
