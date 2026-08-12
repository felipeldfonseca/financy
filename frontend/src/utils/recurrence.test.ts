import { projectBillsIntoMonth, addMonthsClampedIso } from './recurrence';
import { Bill } from '../services/billApi';

const bill = (overrides: Partial<Bill>): Bill =>
  ({
    id: 'bill-1',
    description: 'Aluguel',
    amount: 1500,
    currency: 'BRL',
    dueDate: '2026-09-05',
    status: 'open',
    userId: 'user-1',
    contextId: 'ctx-1',
    createdAt: '',
    updatedAt: '',
    isOverdue: false,
    ...overrides,
  }) as Bill;

describe('projectBillsIntoMonth', () => {
  it('shows a monthly bill again in every following month', () => {
    // The reported gap: rent due 05/09 was invisible in October and November.
    const monthly = bill({ recurrenceRule: 'monthly' });

    const october = projectBillsIntoMonth([monthly], '2026-10');
    expect(october).toHaveLength(1);
    expect(october[0].dueDate).toBe('2026-10-05');
    expect(october[0].projected).toBe(true);
    expect(october[0].id).toBe('bill-1:2026-10-05');

    const november = projectBillsIntoMonth([monthly], '2026-11');
    expect(november[0].dueDate).toBe('2026-11-05');
  });

  it('never duplicates the real row in its own month', () => {
    expect(projectBillsIntoMonth([bill({ recurrenceRule: 'monthly' })], '2026-09')).toEqual([]);
  });

  it('projects every weekly occurrence of the month', () => {
    const weekly = bill({ dueDate: '2026-09-01', recurrenceRule: 'weekly' });

    const september = projectBillsIntoMonth([weekly], '2026-09');
    expect(september.map((ghost) => ghost.dueDate)).toEqual([
      '2026-09-08',
      '2026-09-15',
      '2026-09-22',
      '2026-09-29',
    ]);
  });

  it('advances installments with their numbers, and stops at the last one', () => {
    const plan = bill({ dueDate: '2026-09-05', installmentNumber: 8, installmentTotal: 10 });

    const october = projectBillsIntoMonth([plan], '2026-10');
    expect(october[0].installmentNumber).toBe(9);

    const november = projectBillsIntoMonth([plan], '2026-11');
    expect(november[0].installmentNumber).toBe(10);

    // The plan is over: December shows nothing.
    expect(projectBillsIntoMonth([plan], '2026-12')).toEqual([]);
  });

  it('clamps the 31st into shorter months, like the backend will', () => {
    const monthly = bill({ dueDate: '2026-01-31', recurrenceRule: 'monthly' });

    expect(projectBillsIntoMonth([monthly], '2026-02')[0].dueDate).toBe('2026-02-28');
    expect(addMonthsClampedIso('2026-01-31', 1)).toBe('2026-02-28');
  });

  it('ignores one-off, paid and not-yet-started bills', () => {
    expect(projectBillsIntoMonth([bill({})], '2026-10')).toEqual([]);
    expect(
      projectBillsIntoMonth([bill({ recurrenceRule: 'monthly', status: 'paid' })], '2026-10'),
    ).toEqual([]);
    // First due date after the viewed month: nothing to project there.
    expect(
      projectBillsIntoMonth([bill({ dueDate: '2026-12-05', recurrenceRule: 'monthly' })], '2026-10'),
    ).toEqual([]);
  });
});
