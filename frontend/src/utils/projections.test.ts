import {
  annualEquivalentPercent,
  monthlyPercentFrom,
  futureValue,
  projectionSeries,
  requiredMonthlyDeposit,
  monthsUntil,
  averageMonthlyDeposit,
} from './projections';

describe('annualEquivalentPercent', () => {
  it('compounds twelve months, not multiplies them', () => {
    expect(annualEquivalentPercent(1)).toBeCloseTo(12.6825, 3);
    expect(annualEquivalentPercent(0)).toBe(0);
  });
});

describe('monthlyPercentFrom', () => {
  it('converts a yearly quote by the twelfth root, not by dividing by 12', () => {
    expect(monthlyPercentFrom(12, 'yearly')).toBeCloseTo(0.9489, 4);
    expect(monthlyPercentFrom(12, 'yearly')).toBeLessThan(1);
  });

  it('passes a monthly quote through untouched', () => {
    expect(monthlyPercentFrom(0.8, 'monthly')).toBe(0.8);
  });

  it('round-trips with annualEquivalentPercent', () => {
    expect(annualEquivalentPercent(monthlyPercentFrom(12, 'yearly'))).toBeCloseTo(12, 6);
  });

  it('treats zero and negatives as no yield', () => {
    expect(monthlyPercentFrom(0, 'yearly')).toBe(0);
    expect(monthlyPercentFrom(-3, 'monthly')).toBe(0);
  });
});

describe('futureValue', () => {
  it('degenerates to the linear sum at rate zero', () => {
    expect(futureValue(1000, 500, 0, 12)).toBe(7000);
  });

  it('compounds deposits month over month', () => {
    // 100 at the end of each of 2 months at 1% a.m.: 100·(1.01² − 1)/0.01
    expect(futureValue(0, 100, 1, 2)).toBeCloseTo(201, 6);
  });

  it('grows the principal alone when nothing is deposited', () => {
    expect(futureValue(1000, 0, 1, 12)).toBeCloseTo(1000 * Math.pow(1.01, 12), 6);
  });

  it('is the principal at month zero', () => {
    expect(futureValue(1234, 500, 2, 0)).toBe(1234);
  });
});

describe('projectionSeries', () => {
  it('walks from the principal to the future value', () => {
    const series = projectionSeries(1000, 500, 0.8, 24);
    expect(series).toHaveLength(25);
    expect(series[0]).toBe(1000);
    expect(series[24]).toBeCloseTo(futureValue(1000, 500, 0.8, 24), 6);
    // strictly increasing: money in plus growth never dips
    series.slice(1).forEach((value, index) => expect(value).toBeGreaterThan(series[index]));
  });
});

describe('requiredMonthlyDeposit', () => {
  it('round-trips with futureValue', () => {
    const monthly = requiredMonthlyDeposit(10000, 1000, 0.8, 24);
    expect(monthly).not.toBeNull();
    expect(futureValue(1000, monthly as number, 0.8, 24)).toBeCloseTo(10000, 6);
  });

  it('degenerates to the linear split at rate zero', () => {
    expect(requiredMonthlyDeposit(7000, 1000, 0, 12)).toBe(500);
  });

  it('is zero once the goal is already funded, even with no time left', () => {
    expect(requiredMonthlyDeposit(500, 800, 1, 12)).toBe(0);
    expect(requiredMonthlyDeposit(500, 800, 1, 0)).toBe(0);
  });

  it('is null when the deadline has passed and money is still missing', () => {
    expect(requiredMonthlyDeposit(1000, 200, 1, 0)).toBeNull();
  });
});

describe('monthsUntil', () => {
  const august2026 = new Date(2026, 7, 13);

  it('counts whole calendar months to the target month', () => {
    expect(monthsUntil('2027-02-15', august2026)).toBe(6);
    expect(monthsUntil('2026-08-30', august2026)).toBe(0);
  });

  it('crosses year ends without losing months', () => {
    expect(monthsUntil('2027-02-01', new Date(2026, 11, 5))).toBe(2);
  });

  it('never goes negative for a past date', () => {
    expect(monthsUntil('2026-01-01', august2026)).toBe(0);
  });
});

describe('averageMonthlyDeposit', () => {
  const now = new Date(2026, 7, 13); // August 2026

  it('averages deposits over the window of calendar months', () => {
    const entries = [
      { amount: 300, date: '2026-08-05' },
      { amount: '300', date: '2026-07-10' },
      { amount: 300, date: '2026-06-01' },
      { amount: 999, date: '2026-05-31' }, // outside the 3-month window
    ];
    expect(averageMonthlyDeposit(entries, 3, now)).toBe(300);
  });

  it('lets empty months drag the average down', () => {
    expect(averageMonthlyDeposit([{ amount: 300, date: '2026-08-01' }], 3, now)).toBe(100);
  });

  it('ignores adjustments — the pace is about deliberate saving', () => {
    const entries = [
      { amount: 300, date: '2026-08-05', kind: 'deposit' },
      { amount: 1000, date: '2026-08-02', kind: 'adjustment' },
    ];
    expect(averageMonthlyDeposit(entries, 3, now)).toBe(100);
  });
});
