import { normalizeDashboardCategory } from './category-normalizer';
import { VALID_DASHBOARD_CATEGORIES } from './constants/categories.constants';

describe('normalizeDashboardCategory', () => {
  it('passes a valid dashboard key straight through', () => {
    expect(normalizeDashboardCategory('expense', 'fooddining')).toBe('fooddining');
    expect(normalizeDashboardCategory('income', 'employment')).toBe('employment');
    expect(normalizeDashboardCategory('transfer', 'debt')).toBe('debt');
  });

  it('tolerates the spacing and punctuation a model adds to a key', () => {
    expect(normalizeDashboardCategory('expense', 'Food Dining')).toBe('fooddining');
    expect(normalizeDashboardCategory('expense', ' HEALTHFITNESS ')).toBe('healthfitness');
  });

  it('maps the human-readable names the receipt prompt itself suggests', () => {
    // The prompt lists keys but gives examples like "Food & Dining", so the
    // model returns either — both must resolve.
    expect(normalizeDashboardCategory('expense', 'Food & Dining')).toBe('fooddining');
    expect(normalizeDashboardCategory('expense', 'Transportation')).toBe('transportation');
    expect(normalizeDashboardCategory('expense', 'Travel & Vacation')).toBe('travellifestyle');
    expect(normalizeDashboardCategory('expense', 'Bills & Utilities')).toBe('billsfinancial');
  });

  it('maps concrete merchant kinds a receipt model tends to answer', () => {
    expect(normalizeDashboardCategory('expense', 'Groceries')).toBe('fooddining');
    expect(normalizeDashboardCategory('expense', 'Pharmacy')).toBe('healthfitness');
    expect(normalizeDashboardCategory('expense', 'Gas Station')).toBe('transportation');
    expect(normalizeDashboardCategory('expense', 'Restaurant')).toBe('fooddining');
    expect(normalizeDashboardCategory('expense', 'Hotel')).toBe('travellifestyle');
  });

  it('maps income and transfer wording too', () => {
    expect(normalizeDashboardCategory('income', 'Monthly salary')).toBe('employment');
    expect(normalizeDashboardCategory('income', 'Dividend payout')).toBe('investment');
    expect(normalizeDashboardCategory('income', 'Tax refund')).toBe('governmentbenefits');
    expect(normalizeDashboardCategory('transfer', 'Savings deposit')).toBe('accounts');
    expect(normalizeDashboardCategory('transfer', 'Loan payment')).toBe('debt');
  });

  it('falls back to other for the unrecognisable', () => {
    expect(normalizeDashboardCategory('expense', 'Uncategorized')).toBe('other');
    expect(normalizeDashboardCategory('expense', 'zzz')).toBe('other');
    expect(normalizeDashboardCategory('expense', '')).toBe('other');
    expect(normalizeDashboardCategory('expense', undefined)).toBe('other');
  });

  it('never returns a key outside the allowed set for the type', () => {
    const cases = ['Food & Dining', 'random', '', 'salary', 'debt'];

    for (const type of ['expense', 'income', 'transfer'] as const) {
      for (const value of cases) {
        expect(VALID_DASHBOARD_CATEGORIES[type]).toContain(
          normalizeDashboardCategory(type, value),
        );
      }
    }
  });

  it('defaults an unknown transaction type to other', () => {
    expect(normalizeDashboardCategory('donation', 'Food & Dining')).toBe('other');
  });
});
