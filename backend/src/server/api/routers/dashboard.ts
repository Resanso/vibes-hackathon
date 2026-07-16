import { z } from "zod";

import { apiKeyProcedure, createTRPCRouter } from "~/server/api/trpc";

export const dashboardRouter = createTRPCRouter({
  trend: apiKeyProcedure
    .input(z.object({ phone: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db.riskEntry.findMany({
        where: { phone: input.phone },
        orderBy: { createdAt: "asc" },
        select: {
          createdAt: true,
          riskScore: true,
          riskLabel: true,
          principal: true,
          monthlyInstallment: true,
        },
      });

      return entries;
    }),
});
