import { resolveBillDueDate } from './bill-detection';

describe('resolveBillDueDate', () => {
  const now = new Date('2026-08-12T15:00:00.000Z');

  it('keeps an explicit due date, even one already past', () => {
    // The founding scenario: an Alares invoice due 05/07, unpaid, sent in
    // August. Still a bill — that is exactly why it needs registering.
    expect(resolveBillDueDate({ dueDate: '2026-07-05', date: '2026-06-28' }, now)).toBe('2026-07-05');
  });

  it('keeps a future due date', () => {
    expect(resolveBillDueDate({ dueDate: '2026-08-20' }, now)).toBe('2026-08-20');
  });

  it('treats a future transaction date as a due date', () => {
    // A purchase receipt cannot record future spending; the model latched
    // onto the bill deadline and put it in `date`.
    expect(resolveBillDueDate({ date: '2026-08-25' }, now)).toBe('2026-08-25');
  });

  it('sees an ordinary past-dated receipt as no bill at all', () => {
    expect(resolveBillDueDate({ date: '2026-08-10' }, now)).toBeNull();
    expect(resolveBillDueDate({ date: now.toISOString().slice(0, 10) }, now)).toBeNull();
  });

  it('ignores absent or malformed dates', () => {
    expect(resolveBillDueDate({}, now)).toBeNull();
    expect(resolveBillDueDate({ dueDate: 'null' }, now)).toBeNull();
    expect(resolveBillDueDate({ dueDate: 'no idea' }, now)).toBeNull();
    expect(resolveBillDueDate({ date: '12/08/2026' }, now)).toBeNull();
  });

  it('normalizes a datetime to its calendar date', () => {
    expect(resolveBillDueDate({ dueDate: '2026-08-20T00:00:00Z' }, now)).toBe('2026-08-20');
  });
});
