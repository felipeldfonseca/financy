/**
 * Compound-growth projections for savings goals. All closed forms, all pure:
 * the stored balance never grows by itself — these functions only answer
 * "what if it did", at the monthly rate the user quoted (% a.m.).
 */

/** 0.8 (% a.m.) → its yearly equivalent in %, compounding included. */
export const annualEquivalentPercent = (monthlyPercent: number): number => {
  const i = monthlyPercent / 100;
  return (Math.pow(1 + i, 12) - 1) * 100;
};

/**
 * Balance after `months`, starting from `principal`, depositing
 * `monthlyDeposit` at the end of each month, growing at `monthlyPercent`
 * % a.m. Rate zero (or negative input, clamped) degenerates to the linear
 * sum: P + m·n.
 */
export const futureValue = (
  principal: number,
  monthlyDeposit: number,
  monthlyPercent: number,
  months: number,
): number => {
  const P = Math.max(0, Number(principal) || 0);
  const m = Math.max(0, Number(monthlyDeposit) || 0);
  const n = Math.max(0, Math.floor(months));
  const i = (Number(monthlyPercent) || 0) / 100;

  if (i <= 0) {
    return P + m * n;
  }

  const growth = Math.pow(1 + i, n);
  return P * growth + (m * (growth - 1)) / i;
};

/** The month-by-month balances [0..months], for drawing the curve. */
export const projectionSeries = (
  principal: number,
  monthlyDeposit: number,
  monthlyPercent: number,
  months: number,
): number[] => {
  const n = Math.max(0, Math.floor(months));
  const series: number[] = [];
  for (let month = 0; month <= n; month += 1) {
    series.push(futureValue(principal, monthlyDeposit, monthlyPercent, month));
  }
  return series;
};

/**
 * The monthly deposit that turns `principal` into `target` in `months`
 * months at `monthlyPercent` % a.m. Zero when the goal is already funded,
 * null when there is no time left to deposit anything.
 */
export const requiredMonthlyDeposit = (
  target: number,
  principal: number,
  monthlyPercent: number,
  months: number,
): number | null => {
  const T = Number(target) || 0;
  const P = Math.max(0, Number(principal) || 0);
  const n = Math.max(0, Math.floor(months));
  const i = (Number(monthlyPercent) || 0) / 100;

  if (n <= 0) {
    return T <= P ? 0 : null;
  }

  if (i <= 0) {
    return Math.max(0, (T - P) / n);
  }

  const growth = Math.pow(1 + i, n);
  return Math.max(0, ((T - P * growth) * i) / (growth - 1));
};

/**
 * Whole calendar months from `from`'s month to `targetDate`'s month —
 * August to next February is 6. Never negative; a past date is 0.
 */
export const monthsUntil = (targetDate: string, from: Date = new Date()): number => {
  const [year, month] = targetDate.slice(0, 10).split('-').map(Number);
  if (!year || !month) {
    return 0;
  }
  const span = (year - from.getFullYear()) * 12 + (month - 1 - from.getMonth());
  return Math.max(0, span);
};

export interface TrailEntry {
  amount: number | string;
  date: string;
  kind?: string;
}

/**
 * The real saving pace: deposits (adjustments never count) over the last
 * `monthsWindow` calendar months including the current one, divided by the
 * window — months without deposits drag the average down on purpose.
 */
export const averageMonthlyDeposit = (
  entries: TrailEntry[],
  monthsWindow: number,
  now: Date = new Date(),
): number => {
  const window = Math.max(1, Math.floor(monthsWindow));
  const start = new Date(now.getFullYear(), now.getMonth() - (window - 1), 1);
  const startKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
  const endKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const total = entries
    .filter((entry) => (entry.kind ?? 'deposit') === 'deposit')
    .filter((entry) => {
      const monthKey = entry.date.slice(0, 7);
      return monthKey >= startKey && monthKey <= endKey;
    })
    .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

  return total / window;
};
