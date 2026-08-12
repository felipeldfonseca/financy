import { computeBudget } from './budget';

describe('computeBudget', () => {
  it('reports no limit as its own state, not a zero-width bar', () => {
    expect(computeBudget({ spent: 100, committed: 50 })).toEqual({
      hasLimit: false,
      spentPct: 0,
      committedPct: 0,
      remaining: 0,
      overBy: 0,
    });
    expect(computeBudget({ spent: 100, committed: 50, limit: 0 }).hasLimit).toBe(false);
  });

  it('splits the bar into spent, committed and remaining', () => {
    const result = computeBudget({ spent: 1500, committed: 900, limit: 3000 });

    expect(result.spentPct).toBeCloseTo(50);
    expect(result.committedPct).toBeCloseTo(30);
    expect(result.remaining).toBeCloseTo(600);
    expect(result.overBy).toBe(0);
  });

  it('never lets the segments overflow the bar, and reports the overshoot', () => {
    // Spent alone exceeds the limit: the committed segment has no room left.
    const blown = computeBudget({ spent: 3500, committed: 400, limit: 3000 });
    expect(blown.spentPct).toBe(100);
    expect(blown.committedPct).toBe(0);
    expect(blown.remaining).toBe(0);
    expect(blown.overBy).toBeCloseTo(900);

    // Spent fits but the committed share is squeezed to the space remaining.
    const squeezed = computeBudget({ spent: 2400, committed: 1200, limit: 3000 });
    expect(squeezed.spentPct).toBeCloseTo(80);
    expect(squeezed.committedPct).toBeCloseTo(20);
    expect(squeezed.overBy).toBeCloseTo(600);
  });

  it('treats negative inputs as zero', () => {
    const result = computeBudget({ spent: -50, committed: -10, limit: 1000 });
    expect(result.spentPct).toBe(0);
    expect(result.remaining).toBe(1000);
  });
});
