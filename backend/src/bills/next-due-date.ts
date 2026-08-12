import { Bill } from './entities/bill.entity';

export const RECURRENCE_RULES = ['weekly', 'monthly', 'yearly'] as const;
export type RecurrenceRule = (typeof RECURRENCE_RULES)[number];

/**
 * Calendar arithmetic on plain YYYY-MM-DD dates, clamped to real days: a bill
 * due on the 31st advanced by one month lands on the last day of the shorter
 * month, not on an invented "March 3rd". Everything is done on UTC fields so
 * no server timezone can shift the calendar date.
 */
export function addMonthsClamped(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  const targetMonthIndex = month - 1 + months;
  const lastDayOfTarget = new Date(Date.UTC(year, targetMonthIndex + 1, 0)).getUTCDate();
  const target = new Date(Date.UTC(year, targetMonthIndex, Math.min(day, lastDayOfTarget)));
  return target.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1, day + days));
  return target.toISOString().slice(0, 10);
}

export interface NextBillTemplate {
  dueDate: string;
  installmentNumber?: number;
  installmentTotal?: number;
  recurrenceRule?: string;
}

/**
 * What paying this bill leaves behind: the next installment (until the last
 * one), or the next occurrence of a recurring bill — or nothing at all for a
 * one-off. Installments advance monthly, the Brazilian default for "3/10".
 */
export function nextBillTemplate(
  bill: Pick<Bill, 'dueDate' | 'installmentNumber' | 'installmentTotal' | 'recurrenceRule'>,
): NextBillTemplate | null {
  const dueDate = String(bill.dueDate).slice(0, 10);

  if (
    bill.installmentNumber != null &&
    bill.installmentTotal != null &&
    bill.installmentNumber < bill.installmentTotal
  ) {
    return {
      dueDate: addMonthsClamped(dueDate, 1),
      installmentNumber: bill.installmentNumber + 1,
      installmentTotal: bill.installmentTotal,
      // A recurring rule on an installment plan is carried, not interpreted:
      // the plan itself is what advances.
      recurrenceRule: bill.recurrenceRule ?? undefined,
    };
  }

  switch (bill.recurrenceRule) {
    case 'weekly':
      return { dueDate: addDays(dueDate, 7), recurrenceRule: 'weekly' };
    case 'monthly':
      return { dueDate: addMonthsClamped(dueDate, 1), recurrenceRule: 'monthly' };
    case 'yearly':
      return { dueDate: addMonthsClamped(dueDate, 12), recurrenceRule: 'yearly' };
    default:
      return null;
  }
}
