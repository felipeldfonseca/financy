import { parseLocalDate, localTodayIso, isBillOverdue, canPayBills, sumByCurrency } from './bills';

describe('parseLocalDate', () => {
  it('reads the date in the local calendar, not UTC', () => {
    const date = parseLocalDate('2026-08-05');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    // The regression this guards: new Date('2026-08-05') in a UTC-3 zone
    // renders as August 4th.
    expect(date.getDate()).toBe(5);
  });

  it('ignores any time part', () => {
    expect(parseLocalDate('2026-08-05T23:59:00Z').getDate()).toBe(5);
  });
});

describe('isBillOverdue', () => {
  const today = new Date(2026, 7, 12); // 12 Aug 2026, local

  it('flags an open bill due before today', () => {
    expect(isBillOverdue({ status: 'open', dueDate: '2026-08-11' }, today)).toBe(true);
  });

  it('does not flag a bill due today', () => {
    expect(isBillOverdue({ status: 'open', dueDate: '2026-08-12' }, today)).toBe(false);
  });

  it('does not flag paid or future bills', () => {
    expect(isBillOverdue({ status: 'paid', dueDate: '2026-08-01' }, today)).toBe(false);
    expect(isBillOverdue({ status: 'open', dueDate: '2026-09-01' }, today)).toBe(false);
  });
});

describe('localTodayIso', () => {
  it('formats with zero padding', () => {
    expect(localTodayIso(new Date(2026, 0, 3))).toBe('2026-01-03');
  });
});

describe('canPayBills', () => {
  it('allows the personal view and any member who records expenses', () => {
    expect(canPayBills(undefined)).toBe(true);
    expect(canPayBills('owner')).toBe(true);
    expect(canPayBills('admin')).toBe(true);
    expect(canPayBills('member')).toBe(true);
  });

  it('refuses a viewer', () => {
    expect(canPayBills('viewer')).toBe(false);
  });
});

describe('sumByCurrency', () => {
  it('keeps currencies apart instead of adding unlike amounts', () => {
    const totals = sumByCurrency([
      { amount: 100, currency: 'BRL' },
      { amount: 50.5, currency: 'BRL' },
      { amount: 10, currency: 'USD' },
    ]);

    expect(totals).toEqual([
      { currency: 'BRL', total: 150.5 },
      { currency: 'USD', total: 10 },
    ]);
  });
});
