import { parsePaymentIntent } from './payment-intent';

describe('parsePaymentIntent', () => {
  it('recognizes Portuguese payment openers', () => {
    expect(parsePaymentIntent('paguei a alares')).toEqual({ tokens: ['alares'], amount: undefined });
    expect(parsePaymentIntent('Já paguei a conta da Alares')).toEqual({
      tokens: ['alares'],
      amount: undefined,
    });
    expect(parsePaymentIntent('quitei o boleto da internet')).toEqual({
      tokens: ['internet'],
      amount: undefined,
    });
    expect(parsePaymentIntent('acabei de pagar o aluguel')).toEqual({
      tokens: ['aluguel'],
      amount: undefined,
    });
  });

  it('recognizes English and Spanish openers', () => {
    expect(parsePaymentIntent('paid the internet bill')).toEqual({
      tokens: ['internet'],
      amount: undefined,
    });
    expect(parsePaymentIntent('I just paid rent')).toEqual({ tokens: ['rent'], amount: undefined });
    expect(parsePaymentIntent('ya pagué la factura de luz')).toEqual({
      tokens: ['luz'],
      amount: undefined,
    });
  });

  it('extracts the amount and keeps the rest as the query', () => {
    expect(parsePaymentIntent('paguei 110,50 da alares')).toEqual({
      tokens: ['alares'],
      amount: 110.5,
    });
    expect(parsePaymentIntent('paguei 101.08')).toEqual({ tokens: [], amount: 101.08 });
  });

  it('matches case- and accent-insensitively', () => {
    expect(parsePaymentIntent('PAGUEI A ALARES')).toEqual({ tokens: ['alares'], amount: undefined });
  });

  it('returns an empty query for a bare "paguei"', () => {
    expect(parsePaymentIntent('paguei')).toEqual({ tokens: [], amount: undefined });
  });

  it('ignores messages that only mention paying mid-sentence', () => {
    // "gastei 50 e paguei estacionamento" is a normal expense report; the
    // opener is what signals settle-a-bill intent.
    expect(parsePaymentIntent('gastei 50 e paguei estacionamento')).toBeNull();
    expect(parsePaymentIntent('spent $30 on lunch')).toBeNull();
    expect(parsePaymentIntent('recebi 1000 de salário')).toBeNull();
  });

  it('drops filler words in every language', () => {
    expect(parsePaymentIntent('paguei a conta de luz de ontem')).toEqual({
      tokens: ['luz'],
      amount: undefined,
    });
    expect(parsePaymentIntent('paid my electricity bill today')).toEqual({
      tokens: ['electricity'],
      amount: undefined,
    });
  });
});
