import { Bill } from '../services/billApi';
import { MemberRole } from '../services/contextApi';

/**
 * A bill's due date is a plain calendar date ('2026-08-05'), not an instant.
 * `new Date('2026-08-05')` would read it as UTC midnight, which in Brazil is
 * still the evening of the 4th — every date would render one day early. Parse
 * it into the user's own calendar instead.
 */
export const parseLocalDate = (isoDate: string): Date => {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};

/** Today as YYYY-MM-DD in the user's own timezone, not UTC. */
export const localTodayIso = (now: Date = new Date()): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/**
 * Overdue as the user experiences it: an open bill whose due date is before
 * today on their calendar. The server derives the same thing against UTC,
 * which runs a few hours ahead of Brazil — so the client derivation wins for
 * display.
 */
export const isBillOverdue = (
  bill: Pick<Bill, 'status' | 'dueDate'>,
  now: Date = new Date(),
): boolean => bill.status === 'open' && bill.dueDate.slice(0, 10) < localTodayIso(now);

/**
 * Whether the signed-in user may settle bills in the current view: in the
 * personal view always, in a shared context any member who can record
 * expenses — the household rule that whoever pays, pays.
 */
export const canPayBills = (contextRole?: MemberRole): boolean => contextRole !== 'viewer';

/**
 * Open bills summed per currency, for the "total pendente" footer. Bills of
 * different currencies never collapse into one meaningless number.
 */
export const sumByCurrency = (bills: Array<Pick<Bill, 'amount' | 'currency'>>): Array<{
  currency: string;
  total: number;
}> => {
  const totals = new Map<string, number>();
  bills.forEach((bill) => {
    totals.set(bill.currency, (totals.get(bill.currency) ?? 0) + Number(bill.amount));
  });
  return Array.from(totals.entries()).map(([currency, total]) => ({ currency, total }));
};
