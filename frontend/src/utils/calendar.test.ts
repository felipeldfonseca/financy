import {
  buildMonthGrid,
  heatBackground,
  monthKey,
  addMonths,
  INCOME_POLE,
  EXPENSE_POLE,
} from './calendar';

describe('buildMonthGrid', () => {
  it('lays out August 2026 with Saturday the 1st and six weeks', () => {
    const weeks = buildMonthGrid(2026, 8);

    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-08-01']);
    expect(weeks[5][0]).toBe('2026-08-30');
    expect(weeks[5][1]).toBe('2026-08-31');
    expect(weeks[5].slice(2)).toEqual([null, null, null, null, null]);
  });

  it('pads every week to seven cells', () => {
    for (const [year, month] of [
      [2026, 2],
      [2027, 1],
      [2024, 2],
    ]) {
      for (const week of buildMonthGrid(year, month)) {
        expect(week).toHaveLength(7);
      }
    }
  });

  it('covers each day exactly once', () => {
    const days = buildMonthGrid(2026, 2).flat().filter(Boolean);
    expect(days).toHaveLength(28);
    expect(days[0]).toBe('2026-02-01');
    expect(days[27]).toBe('2026-02-28');
  });
});

describe('heatBackground', () => {
  it('keeps the neutral surface for a day with no movement', () => {
    // The diverging midpoint is the absence of tint, never a third hue.
    expect(heatBackground(0, 500)).toBeUndefined();
    expect(heatBackground(100, 0)).toBeUndefined();
  });

  it('tints income days blue and expense days orange', () => {
    expect(heatBackground(100, 100)).toContain('rgba(63, 127, 191');
    expect(heatBackground(-100, 100)).toContain('rgba(192, 95, 51');
  });

  it('scales intensity with the day share of the month maximum', () => {
    const faint = heatBackground(-10, 1000)!;
    const strong = heatBackground(-1000, 1000)!;
    const alphaOf = (value: string) => Number(value.match(/([\d.]+)\)$/)![1]);

    expect(alphaOf(faint)).toBeLessThan(alphaOf(strong));
    expect(alphaOf(strong)).toBeLessThanOrEqual(0.64);
    // The smallest non-zero day still reads as tinted.
    expect(alphaOf(faint)).toBeGreaterThanOrEqual(0.14);
  });

  it('uses the validated pole pair', () => {
    expect(INCOME_POLE).toBe('#3f7fbf');
    expect(EXPENSE_POLE).toBe('#c05f33');
  });
});

describe('month helpers', () => {
  it('formats the month key and navigates by whole months', () => {
    expect(monthKey(new Date(2026, 7, 15))).toBe('2026-08');
    expect(monthKey(addMonths(new Date(2026, 11, 31), 1))).toBe('2027-01');
    expect(monthKey(addMonths(new Date(2026, 0, 31), -1))).toBe('2025-12');
  });
});
