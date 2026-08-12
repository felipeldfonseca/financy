/**
 * Pure pieces of the calendar heatmap: the month grid and the diverging heat
 * scale. The palette pair (income blue #3f7fbf ↔ expense orange #c05f33) is
 * CVD-validated against the app's light surface — ΔE 20+ in every simulated
 * mode — with the neutral surface itself as the zero midpoint, so "no money
 * moved" is the absence of tint, never a third hue.
 */

export const INCOME_POLE = '#3f7fbf';
export const EXPENSE_POLE = '#c05f33';

export interface CalendarDaySummary {
  date: string;
  income: number;
  expense: number;
  count: number;
}

export const monthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const addMonths = (date: Date, delta: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + delta, 1);

/**
 * Weeks of ISO dates for a month, Sunday-first, padded with nulls so every
 * week has seven cells. monthNumber is 1-12, as in the YYYY-MM key.
 */
export const buildMonthGrid = (year: number, monthNumber: number): (string | null)[][] => {
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();

  const cells: (string | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (string | null)[][] = [];
  for (let start = 0; start < cells.length; start += 7) {
    weeks.push(cells.slice(start, start + 7));
  }
  return weeks;
};

/**
 * The tint for a day's net movement. Zero (or no data) keeps the surface;
 * intensity scales with the day's share of the month's largest swing, floored
 * so the smallest non-zero day is still visibly tinted.
 */
export const heatBackground = (net: number, maxAbs: number): string | undefined => {
  if (!net || !maxAbs) {
    return undefined;
  }

  const intensity = Math.min(Math.abs(net) / maxAbs, 1);
  const alpha = 0.14 + 0.5 * intensity;
  const pole = net > 0 ? INCOME_POLE : EXPENSE_POLE;
  const red = parseInt(pole.slice(1, 3), 16);
  const green = parseInt(pole.slice(3, 5), 16);
  const blue = parseInt(pole.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`;
};

/** Localized "agosto de 2026" style label, capitalized. */
export const monthLabel = (date: Date, locale: string): string => {
  const label = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/** Seven weekday initials in the given locale, Sunday first. */
export const weekdayInitials = (locale: string): string[] =>
  Array.from({ length: 7 }, (_, weekday) =>
    new Date(2026, 7, 2 + weekday) // 2026-08-02 is a Sunday
      .toLocaleDateString(locale, { weekday: 'narrow' }),
  );
