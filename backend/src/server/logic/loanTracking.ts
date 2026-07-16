function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

// Daily target = monthlyInstallment spread evenly across the calendar month
// the tracking starts in — reused every day of that tracking (not
// recomputed monthly), so the amount the student sees never shifts under
// them mid-loan.
export function computeDailyTarget(monthlyInstallment: number, referenceDate = new Date()): number {
  return Math.ceil(monthlyInstallment / daysInMonth(referenceDate));
}

// Normalizes any Date to UTC midnight of that calendar day — the shape
// DailyCheckIn.date is stored in, so a WhatsApp reply and an in-app tap on
// the same day collide on the same row instead of double-counting.
export function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export interface LoanTrackingProgressInput {
  dailyTargetAmount: number;
  totalRepayment: number;
  checkInDates: Date[]; // one per confirmed day, any order
  now?: Date;
}

export interface LoanTrackingProgress {
  dailyTargetAmount: number;
  daysConfirmed: number;
  amountSaved: number;
  remainingAmount: number;
  confirmedToday: boolean;
}

// Pure — no DB access, so it's unit-testable and the API layer just wires
// Prisma rows into this shape (see routers/tracking.ts).
export function computeProgress(input: LoanTrackingProgressInput): LoanTrackingProgress {
  const now = input.now ?? new Date();
  const today = startOfDayUTC(now).getTime();

  const daysConfirmed = input.checkInDates.length;
  const amountSaved = daysConfirmed * input.dailyTargetAmount;
  const remainingAmount = Math.max(0, input.totalRepayment - amountSaved);
  const confirmedToday = input.checkInDates.some(
    (date) => startOfDayUTC(date).getTime() === today,
  );

  return {
    dailyTargetAmount: input.dailyTargetAmount,
    daysConfirmed,
    amountSaved,
    remainingAmount,
    confirmedToday,
  };
}
