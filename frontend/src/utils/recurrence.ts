import { Bill } from '../services/billApi';

/**
 * Future occurrences of recurring and installment bills, projected into a
 * viewed month — the calendar-app treatment of recurrence: one real row in
 * the database (the next unpaid occurrence; paying it spawns the following
 * one), and everything beyond it drawn as a projection, never stored. Keeps
 * the pending list honest while the calendar still shows September's rent
 * again in October and November.
 */
export type ProjectedBill = Bill & {
  /** True for computed future occurrences; absent on real rows. */
  projected?: boolean;
};

/** Same clamped calendar arithmetic the backend uses to spawn successors. */
export const addMonthsClampedIso = (isoDate: string, months: number): string => {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  const targetMonthIndex = month - 1 + months;
  const lastDay = new Date(Date.UTC(year, targetMonthIndex + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, targetMonthIndex, Math.min(day, lastDay)))
    .toISOString()
    .slice(0, 10);
};

export const addDaysIso = (isoDate: string, days: number): string => {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

const monthStart = (monthKey: string): string => `${monthKey}-01`;
const monthEnd = (monthKey: string): string => {
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${monthKey}-${String(lastDay).padStart(2, '0')}`;
};

/**
 * Ghost occurrences of the given open bills that fall inside the month.
 * Only dates strictly after each bill's own due date are projected — the
 * real row represents itself. Ghosts carry a composite id so React keys and
 * lookups never collide with real bills.
 */
export const projectBillsIntoMonth = (openBills: Bill[], monthKey: string): ProjectedBill[] => {
  const start = monthStart(monthKey);
  const end = monthEnd(monthKey);
  const ghosts: ProjectedBill[] = [];

  for (const bill of openBills) {
    if (bill.status !== 'open') continue;
    const baseDue = bill.dueDate.slice(0, 10);
    if (baseDue > end) continue; // its own future is beyond the viewed month

    const remainingInstallments =
      bill.installmentNumber != null && bill.installmentTotal != null
        ? bill.installmentTotal - bill.installmentNumber
        : null;

    const push = (dueDate: string, installmentNumber?: number) =>
      ghosts.push({
        ...bill,
        id: `${bill.id}:${dueDate}`,
        dueDate,
        installmentNumber: installmentNumber ?? bill.installmentNumber,
        projected: true,
      });

    if (remainingInstallments != null) {
      // An installment plan advances monthly, and ends.
      for (let step = 1; step <= remainingInstallments; step += 1) {
        const dueDate = addMonthsClampedIso(baseDue, step);
        if (dueDate > end) break;
        if (dueDate >= start) push(dueDate, (bill.installmentNumber as number) + step);
      }
      continue;
    }

    if (!bill.recurrenceRule) continue;

    let cursor = baseDue;
    // 400 steps ≈ 7 years of weekly occurrences: a bound, not a limit.
    for (let step = 0; step < 400; step += 1) {
      cursor =
        bill.recurrenceRule === 'weekly'
          ? addDaysIso(cursor, 7)
          : bill.recurrenceRule === 'yearly'
            ? addMonthsClampedIso(cursor, 12)
            : addMonthsClampedIso(cursor, 1);
      if (cursor > end) break;
      if (cursor >= start) push(cursor);
    }
  }

  return ghosts;
};
