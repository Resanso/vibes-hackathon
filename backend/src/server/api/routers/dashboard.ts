import { z } from "zod";

import { apiKeyProcedure, createTRPCRouter } from "~/server/api/trpc";

export const dashboardRouter = createTRPCRouter({
  // Only RiskEntry rows the student actually marked as taken (has a
  // LoanTracking) — risk.assess runs on every BorrowingScenario submission,
  // including repeated testing/exploration, so showing every one of those
  // would clutter the trend with simulations that were never real
  // borrowing decisions. See mobile-app's "Saya Jadi Ambil Pinjaman Ini".
  trend: apiKeyProcedure
    .input(z.object({ phone: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db.riskEntry.findMany({
        where: { phone: input.phone, tracking: { isNot: null } },
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
