/**
 * The budget bar's arithmetic. Three quantities share one bar: money already
 * spent (solid), money promised to open bills this month (hatched,
 * "comprometido"), and what is left. Segments are percentages of the limit,
 * clamped so the bar never overflows its own geometry — the overshoot is
 * reported as a number instead, because "estourou em R$ 320" says more than a
 * bar cut off at the edge.
 */
export interface BudgetBreakdown {
  hasLimit: boolean;
  spentPct: number;
  committedPct: number;
  remaining: number;
  overBy: number;
}

export const computeBudget = (params: {
  spent: number;
  committed: number;
  limit?: number | null;
}): BudgetBreakdown => {
  const spent = Math.max(0, params.spent);
  const committed = Math.max(0, params.committed);
  const limit = params.limit ?? 0;

  if (!limit || limit <= 0) {
    return { hasLimit: false, spentPct: 0, committedPct: 0, remaining: 0, overBy: 0 };
  }

  const spentPct = Math.min((spent / limit) * 100, 100);
  const committedPct = Math.min((committed / limit) * 100, 100 - spentPct);
  const total = spent + committed;

  return {
    hasLimit: true,
    spentPct,
    committedPct,
    remaining: Math.max(limit - total, 0),
    overBy: Math.max(total - limit, 0),
  };
};
