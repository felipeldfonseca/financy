/**
 * The dashboard's period filter: which date range feeds the summary, the
 * categories and the charts — and the shape the evolution chart takes
 * (months, or the current month's day-by-day run).
 */

export type DashboardPeriod = 'this-month' | '6m' | '12m';

export const periodMonths = (period: DashboardPeriod): number =>
  period === '12m' ? 12 : period === '6m' ? 6 : 1;

/**
 * First day of the period through today, as ISO dates. "6m" spans the
 * current month plus the five before it — the same window the monthly
 * aggregation answers for.
 */
export const periodRange = (
  period: DashboardPeriod,
  now: Date = new Date(),
): { startDate: string; endDate: string } => {
  const span = periodMonths(period);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (span - 1), 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  };
};

export interface CalendarDayTotals {
  date: string;
  income: number;
  expense: number;
}

export interface EvolutionPoint {
  label: string;
  income: number;
  expense: number;
}

/**
 * The month's run: cumulative income and expense per day, from the 1st
 * through `throughDate` — days without movement carry the previous total,
 * so the line never has holes. The gap between the two lines on any day is
 * the month's balance so far.
 */
export const cumulativeFromCalendar = (
  days: CalendarDayTotals[],
  throughDate: string,
): EvolutionPoint[] => {
  const lastDay = Number(throughDate.slice(8, 10));
  const month = throughDate.slice(0, 7);
  if (!Number.isFinite(lastDay) || lastDay < 1) {
    return [];
  }

  const byDay = new Map(
    days
      .filter((day) => day.date.slice(0, 7) === month)
      .map((day) => [Number(day.date.slice(8, 10)), day]),
  );

  const points: EvolutionPoint[] = [];
  let income = 0;
  let expense = 0;
  for (let day = 1; day <= lastDay; day += 1) {
    const totals = byDay.get(day);
    income += Number(totals?.income ?? 0);
    expense += Number(totals?.expense ?? 0);
    points.push({ label: String(day), income, expense });
  }
  return points;
};

/**
 * Whether there is enough history for a monthly chart to say anything:
 * at least two distinct months with any movement. Below that, the
 * dashboard falls back to the current month's day-by-day view.
 */
export const hasMonthlyHistory = (
  series: Array<{ income: number; expense: number }>,
): boolean => series.filter((month) => month.income > 0 || month.expense > 0).length >= 2;
