/**
 * A goal's visual progress. The bar caps at 100% — geometry never overflows —
 * while the ratio keeps the real number, so "104%" can still be said in text
 * where saying it is the point.
 */
export const goalProgress = (
  currentAmount: number,
  targetAmount: number,
): { percent: number; ratio: number } => {
  const target = Number(targetAmount);
  const current = Math.max(0, Number(currentAmount));

  if (!target || target <= 0) {
    return { percent: 0, ratio: 0 };
  }

  const ratio = current / target;
  return { percent: Math.min(ratio * 100, 100), ratio };
};
