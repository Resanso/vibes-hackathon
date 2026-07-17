import { TRPCError } from "@trpc/server";

import { db } from "~/server/db";
import { explainRisk } from "~/server/ai/explainRisk";
import { calculateRiskScore } from "~/server/logic/riskScore";
import { simulateLoan } from "~/server/logic/simulateLoan";

export interface AssessRiskInput {
  phone: string;
  principal: number;
  interestRatePct: number;
  serviceFee: number;
  tenorMonths: number;
}

// Shared by risk.assess (tRPC) and the AI coach's assessLoanRisk tool
// (src/server/ai/coachChat.ts) — one place that creates a RiskEntry, so a
// loan simulation always ends up on the SafetyDashboard/reminders/tracking
// regardless of which surface (mobile-app's BorrowingScenario form, or a
// free-text chat message) triggered it.
export async function assessRiskForPhone(input: AssessRiskInput) {
  const profile = await db.profile.findUnique({ where: { phone: input.phone } });

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

  const entry = await db.riskEntry.create({
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
}
