import en from './en/contexts.json';
import pt from './pt/contexts.json';
import es from './es/contexts.json';
import enTransactions from './en/transactions.json';
import ptTransactions from './pt/transactions.json';
import esTransactions from './es/transactions.json';
import enNavigation from './en/navigation.json';
import ptNavigation from './pt/navigation.json';
import esNavigation from './es/navigation.json';
import enDashboard from './en/dashboard.json';
import ptDashboard from './pt/dashboard.json';
import esDashboard from './es/dashboard.json';
import enAuth from './en/auth.json';
import ptAuth from './pt/auth.json';
import esAuth from './es/auth.json';

const flatten = (value: Record<string, any>, prefix = ''): string[] =>
  Object.entries(value).flatMap(([key, entry]) =>
    entry !== null && typeof entry === 'object'
      ? flatten(entry, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );

/**
 * A key present in English but missing elsewhere renders as the raw key in the
 * UI — the failure users actually saw in the transaction list. English is the
 * reference because it is the fallback language.
 */
const namespaces: Array<[string, Record<string, any>, Record<string, any>, Record<string, any>]> = [
  ['contexts', en, pt, es],
  ['transactions', enTransactions, ptTransactions, esTransactions],
  ['navigation', enNavigation, ptNavigation, esNavigation],
  ['dashboard', enDashboard, ptDashboard, esDashboard],
  ['auth', enAuth, ptAuth, esAuth],
];

describe('translation coverage', () => {
  it.each(namespaces)('%s is fully translated into Portuguese and Spanish', (_name, english, portuguese, spanish) => {
    const expected = flatten(english);

    expect(expected.filter((key) => !flatten(portuguese).includes(key))).toEqual([]);
    expect(expected.filter((key) => !flatten(spanish).includes(key))).toEqual([]);
  });

  it('leaves no empty strings behind', () => {
    namespaces.forEach(([, ...locales]) => {
      locales.forEach((locale) => {
        const blanks = Object.entries(locale).length === 0 ? ['<empty namespace>'] : [];
        expect(blanks).toEqual([]);
      });
    });
  });
});
