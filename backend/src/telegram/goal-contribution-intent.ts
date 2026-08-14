import { normalizeForMatch } from './payment-intent';

/**
 * Recognizes "I put money aside" messages in the bot's three languages, so a
 * text like "aportei 500 no dólar" tops up a savings goal instead of being
 * parsed as an expense.
 *
 * Deliberately narrow, like the payment intent: only messages that OPEN with
 * a saving verb qualify, and the caller only acts when an active goal
 * actually matches — everything else falls through untouched.
 */

export interface ContributionIntent {
  /** Meaningful words to match against goal names, normalized. */
  tokens: string[];
  /** The amount to deposit, if the message named one. */
  amount?: number;
}

const INTENT_PATTERNS = [
  /^(?:ja\s+)?(?:aportei|guardei|poupei|depositei|apliquei)\b/, // pt
  /^acabei\s+de\s+(?:aportar|guardar|depositar|aplicar)\b/, // pt
  /^(?:i\s+)?(?:just\s+)?(?:saved|deposited)\b/, // en
  /^i've\s+(?:saved|deposited)\b/, // en
  /^put\s+(?:aside|away)\b/, // en: "put aside 500 for the trip"
  /^(?:ya\s+)?(?:aporte|ahorre|guarde|deposite)\b/, // es (accents stripped)
];

// Words that carry no identity: articles, prepositions, the words for
// "goal" itself, and currency names, in all three languages.
const STOPWORDS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'na', 'no',
  'nas', 'nos', 'em', 'para', 'pra', 'pro', 'meu', 'minha', 'meus', 'minhas',
  'essa', 'esse', 'esta', 'este', 'ontem', 'hoje', 'agora', 'mes', 'mais',
  'meta', 'metas', 'objetivo', 'poupanca', 'cofrinho', 'caixinha', 'reserva',
  'the', 'my', 'that', 'this', 'of', 'for', 'to', 'on', 'in', 'at', 'into',
  'yesterday', 'today', 'now', 'goal', 'fund', 'savings',
  'la', 'el', 'las', 'los', 'una', 'mi', 'mis', 'esa', 'ese', 'ayer', 'hoy',
  'ahorro', 'ahorros', 'fondo',
  'reais', 'real', 'dolares', 'dollars', 'euros',
]);

export function parseContributionIntent(text: string): ContributionIntent | null {
  const normalized = normalizeForMatch(text.trim());

  const pattern = INTENT_PATTERNS.find((candidate) => candidate.test(normalized));
  if (!pattern) {
    return null;
  }

  let rest = normalized.replace(pattern, ' ');

  // First number in the message is the amount: "aportei 1500,50 no dólar".
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
