import { z } from "zod";

import { apiKeyProcedure, createTRPCRouter } from "~/server/api/trpc";

export const profileRouter = createTRPCRouter({
  upsert: apiKeyProcedure
    .input(
      z.object({
        phone: z.string().min(1),
        monthlyIncome: z.number().int().nonnegative(),
        existingMonthlyDebt: z.number().int().nonnegative().default(0),
        dependents: z.number().int().nonnegative().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.profile.upsert({
        where: { phone: input.phone },
        create: input,
        update: {
          monthlyIncome: input.monthlyIncome,
          existingMonthlyDebt: input.existingMonthlyDebt,
          dependents: input.dependents,
        },
      });
    }),

  get: apiKeyProcedure
    .input(z.object({ phone: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.profile.findUnique({ where: { phone: input.phone } });
    }),
});
