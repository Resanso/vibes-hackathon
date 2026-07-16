export type RiskLabel = "aman" | "waspada" | "bahaya";

export interface RiskScoreInput {
  monthlyIncome: number;
  existingMonthlyDebt: number;
  monthlyInstallment: number;
  tenorMonths: number;
}

export interface RiskScoreResult {
  score: number;
  label: RiskLabel;
  reasons: string[];
}

const LONG_TENOR_MONTHS = 24;
const TENOR_PENALTY = 10;

// Deterministic, pure debt-service-ratio (DSR) score — NEVER let the AI
// produce this number. explainRisk() only narrates what this function
// already decided.
export function calculateRiskScore(input: RiskScoreInput): RiskScoreResult {
  const { monthlyIncome, existingMonthlyDebt, monthlyInstallment, tenorMonths } =
    input;

  const totalMonthlyDebt = existingMonthlyDebt + monthlyInstallment;
  const dsr = monthlyIncome > 0 ? totalMonthlyDebt / monthlyIncome : 1;

  const base = Math.min(100, Math.round(dsr * 100));
  const tenorPenalty = tenorMonths > LONG_TENOR_MONTHS ? TENOR_PENALTY : 0;
  const score = Math.min(100, base + tenorPenalty);

  const label: RiskLabel = score <= 30 ? "aman" : score <= 60 ? "waspada" : "bahaya";

  const dsrPct = Math.round(dsr * 100);
  const reasons: string[] = [
    `Cicilan barumu + utang existing = ${dsrPct}% dari pemasukan bulananmu.`,
  ];
  if (tenorPenalty > 0) {
    reasons.push(
      `Tenor ${tenorMonths} bulan lebih dari ${LONG_TENOR_MONTHS} bulan, jadi risikonya ditambah.`,
    );
  }

  return { score, label, reasons };
}
