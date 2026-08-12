import { PaymentIntent, normalizeForMatch } from './payment-intent';

export interface MatchableBill {
  id: string;
  description: string;
  merchantName?: string | null;
  amount: number | string;
}

/**
 * Which open bills a payment message is talking about. Strict on purpose:
 * every meaningful word must appear in the bill's text, because a false match
 * would hijack an ordinary expense message into "settle this bill?". With no
 * words, an amount that matches to the cent is accepted instead.
 */
export function matchBills<T extends MatchableBill>(bills: T[], intent: PaymentIntent): T[] {
  if (intent.tokens.length > 0) {
    return bills.filter((bill) => {
      const haystack = normalizeForMatch(`${bill.description} ${bill.merchantName ?? ''}`);
      return intent.tokens.every((token) => haystack.includes(token));
    });
  }

  if (intent.amount !== undefined) {
    return bills.filter((bill) => Math.abs(Number(bill.amount) - intent.amount) < 0.005);
  }

  return [];
}
