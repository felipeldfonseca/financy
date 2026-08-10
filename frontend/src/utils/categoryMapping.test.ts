import {
  dashboardCategoryMapping,
  getDashboardCategory,
  getDetailedCategoryForSubcategory,
  calculateDashboardCategoryTotals,
  subcategoryTranslationPaths,
} from './categoryMapping';
import ptTransactions from '../locales/pt/transactions.json';
import enTransactions from '../locales/en/transactions.json';
import esTransactions from '../locales/es/transactions.json';

const lookup = (translations: any, path: string): unknown =>
  path.split('.').reduce((value, segment) => (value == null ? undefined : value[segment]), translations);

describe('getDetailedCategoryForSubcategory', () => {
  /**
   * Regression guard: the form used to save the dashboard category key in the
   * category field, which made the transaction list render raw translation
   * keys and the dashboard bucket everything under "Other".
   */
  it('resolves the detailed category a subcategory belongs to', () => {
    expect(getDetailedCategoryForSubcategory('expense', 'groceries')).toBe('food');
    expect(getDetailedCategoryForSubcategory('expense', 'fuel')).toBe('transportation');
    expect(getDetailedCategoryForSubcategory('expense', 'gym')).toBe('healthfitness');
    expect(getDetailedCategoryForSubcategory('income', 'salary')).toBe('employment');
    expect(getDetailedCategoryForSubcategory('transfer', 'mortgage')).toBe('debt');
  });

  it('never returns a dashboard category key', () => {
    // 'fooddining' is a dashboard key; the detailed key is 'food'.
    expect(getDetailedCategoryForSubcategory('expense', 'groceries')).not.toBe('fooddining');
  });

  it('ignores a subcategory that belongs to another transaction type', () => {
    expect(getDetailedCategoryForSubcategory('income', 'groceries')).toBeUndefined();
    expect(getDetailedCategoryForSubcategory('expense', 'salary')).toBeUndefined();
  });

  it('returns undefined when there is no subcategory to derive from', () => {
    expect(getDetailedCategoryForSubcategory('expense', undefined)).toBeUndefined();
    expect(getDetailedCategoryForSubcategory('expense', 'not-a-subcategory')).toBeUndefined();
  });

  it('round-trips into a dashboard category the dashboard understands', () => {
    const detailed = getDetailedCategoryForSubcategory('expense', 'groceries')!;

    expect(getDashboardCategory('expense', detailed)).toBe('fooddining');
  });
});

describe('getDashboardCategory', () => {
  it('maps detailed categories to their dashboard bucket', () => {
    expect(getDashboardCategory('expense', 'food')).toBe('fooddining');
    expect(getDashboardCategory('expense', 'shopping')).toBe('entertainmentshopping');
    expect(getDashboardCategory('income', 'selfemployment')).toBe('employment');
  });

  it('passes through rows that already hold a dashboard key', () => {
    // Transactions created before the fix stored the dashboard key directly;
    // they must not all collapse into "other".
    expect(getDashboardCategory('expense', 'fooddining')).toBe('fooddining');
    expect(getDashboardCategory('expense', 'entertainmentshopping')).toBe('entertainmentshopping');
    expect(getDashboardCategory('transfer', 'accounts')).toBe('accounts');
  });

  it('falls back to other for unknown categories and types', () => {
    expect(getDashboardCategory('expense', 'nonsense')).toBe('other');
    expect(getDashboardCategory('nonsense', 'food')).toBe('other');
  });
});

describe('calculateDashboardCategoryTotals', () => {
  it('groups amounts under the right bucket instead of other', () => {
    const totals = calculateDashboardCategoryTotals(
      [
        { type: 'expense', category: 'food', amount: 50 },
        { type: 'expense', category: 'food', amount: 25.5 },
        { type: 'expense', category: 'transportation', amount: 30 },
        { type: 'income', category: 'employment', amount: 1000 },
      ],
      'expense',
    );

    expect(totals).toEqual({ fooddining: 75.5, transportation: 30 });
  });
});

describe('subcategory translation paths', () => {
  it.each([
    ['pt', ptTransactions],
    ['en', enTransactions],
    ['es', esTransactions],
  ])('resolves to a real string in %s', (_locale, translations) => {
    const missing = Object.values(subcategoryTranslationPaths).filter(
      (path) => typeof lookup(translations, path) !== 'string',
    );

    expect(missing).toEqual([]);
  });

  it('points every path at a detailed category the dashboard mapping knows', () => {
    const unknown = Object.entries(subcategoryTranslationPaths).filter(([, path]) => {
      const [, type, detailed] = path.split('.');
      return !dashboardCategoryMapping[type]?.[detailed];
    });

    expect(unknown).toEqual([]);
  });
});
