import {
  periodRange,
  cumulativeFromCalendar,
  hasMonthlyHistory,
} from './dashboardPeriod';

describe('periodRange', () => {
  const august = new Date(Date.UTC(2026, 7, 17));

  it('spans the current month plus the previous ones', () => {
    expect(periodRange('6m', august)).toEqual({ startDate: '2026-03-01', endDate: '2026-08-17' });
    expect(periodRange('12m', august)).toEqual({ startDate: '2025-09-01', endDate: '2026-08-17' });
  });

  it('this-month starts on the 1st', () => {
    expect(periodRange('this-month', august)).toEqual({
      startDate: '2026-08-01',
      endDate: '2026-08-17',
    });
  });

  it('crosses year ends without losing months', () => {
    const january = new Date(Date.UTC(2026, 0, 10));
    expect(periodRange('6m', january).startDate).toBe('2025-08-01');
  });
});

describe('cumulativeFromCalendar', () => {
  it('accumulates day by day, carrying totals over quiet days', () => {
    const points = cumulativeFromCalendar(
      [
        { date: '2026-08-02', income: 1000, expense: 0 },
        { date: '2026-08-05', income: 0, expense: 300 },
      ],
      '2026-08-06',
    );

    expect(points).toHaveLength(6);
    expect(points[0]).toEqual({ label: '1', income: 0, expense: 0 });
    expect(points[1]).toEqual({ label: '2', income: 1000, expense: 0 });
    // day 3 and 4 carry day 2's totals — the line has no holes
    expect(points[3]).toEqual({ label: '4', income: 1000, expense: 0 });
    expect(points[5]).toEqual({ label: '6', income: 1000, expense: 300 });
  });

  it('ignores days from other months', () => {
    const points = cumulativeFromCalendar(
      [{ date: '2026-07-31', income: 999, expense: 0 }],
      '2026-08-03',
    );
    expect(points[2]).toEqual({ label: '3', income: 0, expense: 0 });
  });
});

describe('hasMonthlyHistory', () => {
  it('needs two distinct months with movement', () => {
    expect(hasMonthlyHistory([{ income: 0, expense: 0 }, { income: 100, expense: 0 }])).toBe(false);
    expect(
      hasMonthlyHistory([
        { income: 0, expense: 50 },
        { income: 100, expense: 0 },
      ]),
    ).toBe(true);
    expect(hasMonthlyHistory([])).toBe(false);
  });
});
