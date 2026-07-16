export interface RiskEntryForReminder {
  id: string;
  phone: string;
  tenorMonths: number;
  monthlyInstallment: number;
  firstDueDate: Date;
}

export interface DueReminder {
  phone: string;
  riskEntryId: string;
  installmentNumber: number;
  dueDate: Date;
  monthlyInstallment: number;
}

// Installment N's due date is firstDueDate + (N-1) months — derived, not
// stored, since there's no payment-tracking feature to know which
// installments already happened. This only ever finds dates landing in the
// window; it never knows whether a past installment was actually paid.
export function findDueInstallments(
  entries: RiskEntryForReminder[],
  withinDays: number,
  now = new Date(),
): DueReminder[] {
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + withinDays);

  const reminders: DueReminder[] = [];

  for (const entry of entries) {
    for (let installmentNumber = 1; installmentNumber <= entry.tenorMonths; installmentNumber++) {
      const dueDate = new Date(entry.firstDueDate);
      dueDate.setMonth(dueDate.getMonth() + (installmentNumber - 1));

      if (dueDate >= now && dueDate <= windowEnd) {
        reminders.push({
          phone: entry.phone,
          riskEntryId: entry.id,
          installmentNumber,
          dueDate,
          monthlyInstallment: entry.monthlyInstallment,
        });
      }
    }
  }

  return reminders;
}
