import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { apiKeyProcedure, createTRPCRouter } from "~/server/api/trpc";
import { explainRisk } from "~/server/ai/explainRisk";
import { calculateRiskScore } from "~/server/logic/riskScore";
import { simulateLoan } from "~/server/logic/simulateLoan";

const assessInput = z.object({
  phone: z.string().min(1),
  principal: z.number().int().positive(),
  interestRatePct: z.number().nonnegative(),
  serviceFee: z.number().int().nonnegative(),
  tenorMonths: z.number().int().positive(),
});

export const riskRouter = createTRPCRouter({
  assess: apiKeyProcedure.input(assessInput).mutation(async ({ ctx, input }) => {
    const profile = await ctx.db.profile.findUnique({
      where: { phone: input.phone },
    });

    if (!profile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Profile belum ada untuk nomor ini — panggil profile.upsert dulu.",
      });
    }

    const simulation = simulateLoan(input);

    const risk = calculateRiskScore({
      monthlyIncome: profile.monthlyIncome,
      existingMonthlyDebt: profile.existingMonthlyDebt,
      monthlyInstallment: simulation.monthlyInstallment,
      tenorMonths: input.tenorMonths,
    });

    const explanation = await explainRisk(risk);

    const firstDueDate = new Date();
    firstDueDate.setMonth(firstDueDate.getMonth() + 1);

    const entry = await ctx.db.riskEntry.create({
      data: {
        phone: input.phone,
        principal: input.principal,
        interestRatePct: input.interestRatePct,
        serviceFee: input.serviceFee,
        tenorMonths: input.tenorMonths,
        monthlyInstallment: simulation.monthlyInstallment,
        totalRepayment: simulation.totalRepayment,
        riskScore: risk.score,
        riskLabel: risk.label,
        explanation,
        firstDueDate,
      },
    });

    return {
      id: entry.id,
      riskScore: entry.riskScore,
      riskLabel: entry.riskLabel,
      reasons: risk.reasons,
      explanation: entry.explanation,
      monthlyInstallment: entry.monthlyInstallment,
      totalRepayment: entry.totalRepayment,
    };
  }),
});
