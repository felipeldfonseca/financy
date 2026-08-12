/**
 * Decides whether a parsed receipt is really a bill awaiting payment, and for
 * when. Two signals count:
 *
 * - The model found an explicit due date ("vencimento", "pagar até"). Kept
 *   even when it is already past — an overdue invoice is still a bill, which
 *   is the whole reason the user photographed it.
 * - The model put the transaction itself in the future. A purchase receipt
 *   cannot record future spending, so a future date only makes sense as the
 *   date the payment is due.
 *
 * Anything else is an ordinary receipt: money already spent, no fork needed.
 */
export function resolveBillDueDate(
  parsed: { dueDate?: string; date?: string },
  now: Date,
): string | null {
  const explicit = normalizeIsoDate(parsed.dueDate);
  if (explicit) {
    return explicit;
  }

  const transactionDate = normalizeIsoDate(parsed.date);
  if (transactionDate && transactionDate > now.toISOString().slice(0, 10)) {
    return transactionDate;
  }

  return null;
}

/** 'YYYY-MM-DD' out of whatever date string the model produced, or null. */
function normalizeIsoDate(value?: string): string | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const candidate = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    return null;
  }

  return Number.isNaN(new Date(candidate).getTime()) ? null : candidate;
}
