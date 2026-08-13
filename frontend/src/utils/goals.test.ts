import { goalProgress } from './goals';

describe('goalProgress', () => {
  it('reports the saved share of the target', () => {
    expect(goalProgress(2500, 10000)).toEqual({ percent: 25, ratio: 0.25 });
    expect(goalProgress(0, 10000)).toEqual({ percent: 0, ratio: 0 });
  });

  it('caps the bar at 100% but keeps the real ratio', () => {
    const over = goalProgress(10400, 10000);
    expect(over.percent).toBe(100);
    expect(over.ratio).toBeCloseTo(1.04);
  });

  it('never divides by a zero or missing target', () => {
    expect(goalProgress(500, 0)).toEqual({ percent: 0, ratio: 0 });
    expect(goalProgress(500, NaN as any)).toEqual({ percent: 0, ratio: 0 });
  });

  it('treats a negative current amount as zero', () => {
    expect(goalProgress(-10, 100)).toEqual({ percent: 0, ratio: 0 });
  });
});
