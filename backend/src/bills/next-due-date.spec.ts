import { addMonthsClamped, addDays, nextBillTemplate } from './next-due-date';

describe('addMonthsClamped', () => {
  it('keeps the day when the target month has room', () => {
    expect(addMonthsClamped('2026-08-12', 1)).toBe('2026-09-12');
    expect(addMonthsClamped('2026-11-05', 2)).toBe('2027-01-05');
  });

  it('clamps the 31st into shorter months instead of overflowing', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2024-01-31', 1)).toBe('2024-02-29'); // leap year
    expect(addMonthsClamped('2026-03-31', 1)).toBe('2026-04-30');
  });

  it('crosses year boundaries', () => {
    expect(addMonthsClamped('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonthsClamped('2024-02-29', 12)).toBe('2025-02-28');
  });
});

describe('addDays', () => {
  it('advances across month and year edges', () => {
    expect(addDays('2026-08-28', 7)).toBe('2026-09-04');
    expect(addDays('2026-12-30', 7)).toBe('2027-01-06');
  });
});

describe('nextBillTemplate', () => {
  it('advances an installment plan one month and one number', () => {
    const next = nextBillTemplate({
      dueDate: '2026-08-12',
      installmentNumber: 3,
      installmentTotal: 10,
      recurrenceRule: null as any,
    });

    expect(next).toEqual({
      dueDate: '2026-09-12',
      installmentNumber: 4,
      installmentTotal: 10,
      recurrenceRule: undefined,
    });
  });

  it('stops after the last installment', () => {
    expect(
      nextBillTemplate({
        dueDate: '2026-08-12',
        installmentNumber: 10,
        installmentTotal: 10,
        recurrenceRule: null as any,
      }),
    ).toBeNull();
  });

  it('spawns the next occurrence for each recurrence rule', () => {
    const base = { installmentNumber: null as any, installmentTotal: null as any };

    expect(nextBillTemplate({ ...base, dueDate: '2026-08-12', recurrenceRule: 'weekly' })).toEqual({
      dueDate: '2026-08-19',
      recurrenceRule: 'weekly',
    });
    expect(nextBillTemplate({ ...base, dueDate: '2026-01-31', recurrenceRule: 'monthly' })).toEqual({
      dueDate: '2026-02-28',
      recurrenceRule: 'monthly',
    });
    expect(nextBillTemplate({ ...base, dueDate: '2026-08-12', recurrenceRule: 'yearly' })).toEqual({
      dueDate: '2027-08-12',
      recurrenceRule: 'yearly',
    });
  });

  it('leaves a one-off bill alone', () => {
    expect(
      nextBillTemplate({
        dueDate: '2026-08-12',
        installmentNumber: null as any,
        installmentTotal: null as any,
        recurrenceRule: null as any,
      }),
    ).toBeNull();
  });
});
