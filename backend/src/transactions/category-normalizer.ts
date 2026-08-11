import { VALID_DASHBOARD_CATEGORIES } from './constants/categories.constants';

/**
 * Turns whatever a language model returns for a category into a valid dashboard
 * category key. The bot's prompts ask for keys like "fooddining", but models
 * drift — they answer "Food & Dining", "groceries", "Pharmacy" — and an
 * unrecognised value used to be stored verbatim, which left the transaction in
 * "Other" on every dashboard. This maps the common shapes back to a key and
 * falls back to "other" only when nothing matches.
 */

type DashboardType = keyof typeof VALID_DASHBOARD_CATEGORIES;

/**
 * Keyword → dashboard key, checked as substrings against the lowercased value.
 * Order matters: the first hit wins, so the more specific words come first.
 */
const EXPENSE_KEYWORDS: Array<[string, string]> = [
  ['grocer', 'fooddining'],
  ['restaurant', 'fooddining'],
  ['food', 'fooddining'],
  ['dining', 'fooddining'],
  ['cafe', 'fooddining'],
  ['coffee', 'fooddining'],
  ['bar', 'fooddining'],
  ['fuel', 'transportation'],
  ['gas', 'transportation'],
  ['transport', 'transportation'],
  ['parking', 'transportation'],
  ['uber', 'transportation'],
  ['taxi', 'transportation'],
  ['rent', 'housing'],
  ['mortgage', 'housing'],
  ['housing', 'housing'],
  ['home', 'housing'],
  ['pharmac', 'healthfitness'],
  ['drug', 'healthfitness'],
  ['health', 'healthfitness'],
  ['medical', 'healthfitness'],
  ['doctor', 'healthfitness'],
  ['fitness', 'healthfitness'],
  ['gym', 'healthfitness'],
  ['entertain', 'entertainmentshopping'],
  ['shopping', 'entertainmentshopping'],
  ['shop', 'entertainmentshopping'],
  ['clothing', 'entertainmentshopping'],
  ['electronic', 'entertainmentshopping'],
  ['bill', 'billsfinancial'],
  ['utilit', 'billsfinancial'],
  ['insurance', 'billsfinancial'],
  ['financial', 'billsfinancial'],
  ['bank', 'billsfinancial'],
  ['tax', 'billsfinancial'],
  ['travel', 'travellifestyle'],
  ['vacation', 'travellifestyle'],
  ['hotel', 'travellifestyle'],
  ['flight', 'travellifestyle'],
];

const INCOME_KEYWORDS: Array<[string, string]> = [
  ['salary', 'employment'],
  ['payroll', 'employment'],
  ['wage', 'employment'],
  ['freelance', 'employment'],
  ['employ', 'employment'],
  ['invest', 'investment'],
  ['dividend', 'investment'],
  ['interest', 'investment'],
  ['business', 'investment'],
  ['benefit', 'governmentbenefits'],
  ['government', 'governmentbenefits'],
  ['refund', 'governmentbenefits'],
  ['pension', 'governmentbenefits'],
];

const TRANSFER_KEYWORDS: Array<[string, string]> = [
  ['saving', 'accounts'],
  ['account', 'accounts'],
  ['debt', 'debt'],
  ['loan', 'debt'],
  ['credit', 'debt'],
];

const KEYWORDS: Record<DashboardType, Array<[string, string]>> = {
  expense: EXPENSE_KEYWORDS,
  income: INCOME_KEYWORDS,
  transfer: TRANSFER_KEYWORDS,
};

/**
 * @returns a key from VALID_DASHBOARD_CATEGORIES for the given type — always a
 * valid one, defaulting to "other".
 */
export function normalizeDashboardCategory(
  transactionType: string,
  rawCategory?: string,
): string {
  const type = (transactionType || '').toLowerCase() as DashboardType;
  const validKeys = VALID_DASHBOARD_CATEGORIES[type];

  if (!validKeys) {
    return 'other';
  }

  const value = (rawCategory || '').trim().toLowerCase();

  if (!value) {
    return 'other';
  }

  // Already a valid key (with or without stray spaces/punctuation).
  const compact = value.replace(/[^a-z]/g, '');
  const exact = validKeys.find((key) => key === compact);
  if (exact) {
    return exact;
  }

  // A recognisable word somewhere in the value.
  for (const [keyword, key] of KEYWORDS[type]) {
    if (value.includes(keyword)) {
      return key;
    }
  }

  return 'other';
}
