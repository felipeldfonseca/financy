import { matchBills } from './bill-matcher';

const bills = [
  { id: '1', description: 'Internet Alares', merchantName: 'Alares Internet', amount: 101.08 },
  { id: '2', description: 'Aluguel', merchantName: null, amount: 1500 },
  { id: '3', description: 'Fatura Nubank', merchantName: 'Nubank', amount: '432.10' },
];

describe('matchBills', () => {
  it('matches by a distinctive word, case- and accent-blind', () => {
    expect(matchBills(bills, { tokens: ['alares'] }).map((b) => b.id)).toEqual(['1']);
    expect(matchBills(bills, { tokens: ['nubank'] }).map((b) => b.id)).toEqual(['3']);
  });

  it('requires every token, so unrelated expenses do not hijack a bill', () => {
    // "paguei mercado alares" is not clearly the Alares bill.
    expect(matchBills(bills, { tokens: ['mercado', 'alares'] })).toEqual([]);
    expect(matchBills(bills, { tokens: ['groceries'] })).toEqual([]);
  });

  it('falls back to an exact amount when no words were given', () => {
    expect(matchBills(bills, { tokens: [], amount: 101.08 }).map((b) => b.id)).toEqual(['1']);
    expect(matchBills(bills, { tokens: [], amount: 432.1 }).map((b) => b.id)).toEqual(['3']);
    expect(matchBills(bills, { tokens: [], amount: 99 })).toEqual([]);
  });

  it('returns nothing for an empty intent — the caller lists the open bills', () => {
    expect(matchBills(bills, { tokens: [] })).toEqual([]);
  });
});
