export interface SimulateLoanInput {
  principal: number;
  interestRatePct: number;
  serviceFee: number;
  tenorMonths: number;
}

export interface LatePaymentProjection {
  monthsLate: number;
  lateFee: number;
  totalOwed: number;
}

export interface SimulateLoanResult {
  totalInterest: number;
  totalRepayment: number;
  monthlyInstallment: number;
  latePaymentProjection: LatePaymentProjection[];
}

// Flat-rate annual interest, prorated over the tenor — the common structure
// for Indonesian pinjol/paylater products. Late fee is assumed at 1% of the
// installment per month missed; no real late-fee schedule was specified, so
// this is a documented placeholder rather than a researched figure.
const LATE_FEE_RATE_PER_MONTH = 0.01;

export function simulateLoan(input: SimulateLoanInput): SimulateLoanResult {
  const { principal, interestRatePct, serviceFee, tenorMonths } = input;

  const totalInterest =
    principal * (interestRatePct / 100) * (tenorMonths / 12);
  const totalRepayment = principal + totalInterest + serviceFee;
  const monthlyInstallment = Math.ceil(totalRepayment / tenorMonths);

  const latePaymentProjection = [1, 2, 3].map((monthsLate) => {
    const lateFee = Math.ceil(
      monthlyInstallment * LATE_FEE_RATE_PER_MONTH * monthsLate,
    );
    return {
      monthsLate,
      lateFee,
      totalOwed: monthlyInstallment + lateFee,
    };
  });

  return {
    totalInterest: Math.ceil(totalInterest),
    totalRepayment: Math.ceil(totalRepayment),
    monthlyInstallment,
    latePaymentProjection,
  };
}
