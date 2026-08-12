/**
 * Recognizes "I paid something" messages in the bot's three languages, so a
 * text like "paguei a alares" can settle an open bill instead of creating a
 * brand-new expense.
 *
 * Deliberately narrow: only messages that OPEN with a payment verb qualify,
 * and the caller only acts when an open bill actually matches — "paid $50 for
 * groceries" with no such bill falls through to the normal expense flow
 * untouched.
 */

export interface PaymentIntent {
  /** Meaningful words to match against bill descriptions, normalized. */
  tokens: string[];
  /** An amount mentioned in the message, if any (also the settlement override). */
  amount?: number;
}

const INTENT_PATTERNS = [
  /^(?:ja\s+)?(?:paguei|quitei|pagamos)\b/, // pt: "paguei...", "já paguei...", "quitei..."
  /^acabei\s+de\s+pagar\b/, // pt: "acabei de pagar..."
  /^(?:i\s+)?(?:just\s+)?paid\b/, // en: "paid...", "i paid...", "just paid..."
  /^i've\s+paid\b/, // en
  /^(?:ya\s+)?(?:pague|pagamos)\b/, // es: "pagué..." (accent stripped), "ya pagué..."
];

// Words that carry no identity: articles, prepositions, and the words for
// "bill" itself, in all three languages.
const STOPWORDS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'na', 'no',
  'nas', 'nos', 'em', 'pelo', 'pela', 'meu', 'minha', 'meus', 'minhas', 'essa',
  'esse', 'esta', 'este', 'aquela', 'aquele', 'ontem', 'hoje', 'agora',
  'conta', 'fatura', 'boleto', 'parcela',
  'the', 'my', 'that', 'this', 'of', 'for', 'to', 'on', 'in', 'at', 'yesterday',
  'today', 'now', 'bill', 'invoice',
  'la', 'el', 'las', 'los', 'una', 'mi', 'mis', 'esa', 'ese', 'ayer', 'hoy',
  'cuenta', 'factura', 'recibo',
  'reais', 'real', 'dolares', 'dollars', 'euros',
]);

/** Lowercase and accent-free, so "Alares" matches "alares" and "pagué" "pague". */
export const normalizeForMatch = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function parsePaymentIntent(text: string): PaymentIntent | null {
  const normalized = normalizeForMatch(text.trim());

  const pattern = INTENT_PATTERNS.find((candidate) => candidate.test(normalized));
  if (!pattern) {
    return null;
  }

  let rest = normalized.replace(pattern, ' ');

  // First number in the message is the amount: "paguei 110,50 da alares".
  let amount: number | undefined;
  const amountMatch = rest.match(/\d+(?:[.,]\d{1,2})?/);
  if (amountMatch) {
    amount = parseFloat(amountMatch[0].replace(',', '.'));
    rest = rest.replace(amountMatch[0], ' ');
  }

  const tokens = rest
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token) && !/^\d+$/.test(token));

  return { tokens, amount };
}
