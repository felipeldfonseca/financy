import { resolveTransactionDate } from './transaction-date';

describe('resolveTransactionDate', () => {
  const now = new Date('2026-08-11T12:00:00.000Z');

  it('keeps a past date from the receipt', () => {
    const result = resolveTransactionDate('2026-08-06', now);
    expect(result.startsWith('2026-08-06')).toBe(true);
  });

  it('keeps today', () => {
    const result = resolveTransactionDate('2026-08-11', now);
    expect(result.startsWith('2026-08-11')).toBe(true);
  });

  it('clamps a future due date to today', () => {
    // The reported bug: a bill's future due date filed the transaction ahead
    // of the dashboard's window, so a confirmed expense never showed up.
    const result = resolveTransactionDate('2026-08-20', now);
    expect(result).toBe(now.toISOString());
  });

  it('falls back to today when no date was parsed', () => {
    expect(resolveTransactionDate(undefined, now)).toBe(now.toISOString());
  });

  it('falls back to today for an unparseable date', () => {
    expect(resolveTransactionDate('not a date', now)).toBe(now.toISOString());
  });
});
