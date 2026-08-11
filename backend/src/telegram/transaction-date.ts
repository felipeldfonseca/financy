/**
 * The date to file a transaction under, given what a model parsed from a
 * message or receipt.
 *
 * A receipt records money already spent, so a future date is wrong — it usually
 * means the model latched onto a bill's due date. Left as-is, the transaction
 * lands in the future, where the dashboard (which runs from the start of the
 * month up to today) never shows it: exactly the "confirmed but missing from the
 * dashboard" case. Future dates are clamped to today; a genuinely past date (a
 * receipt from a few days ago) is kept.
 */
export function resolveTransactionDate(parsedDate: string | undefined, now: Date): string {
  if (parsedDate) {
    const parsed = new Date(parsedDate);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() <= now.getTime()) {
      return parsed.toISOString();
    }
  }
  return now.toISOString();
}
