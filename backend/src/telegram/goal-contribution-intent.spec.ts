import { parseContributionIntent } from './goal-contribution-intent';
import { matchGoals } from './goal-matcher';

describe('parseContributionIntent', () => {
  it('recognizes the pt-BR verbs with amount and goal words', () => {
    const intent = parseContributionIntent('Aportei 500 no Dólar');
    expect(intent).not.toBeNull();
    expect(intent!.amount).toBe(500);
    expect(intent!.tokens).toEqual(['dolar']);
  });

  it('reads decimal amounts with comma', () => {
    const intent = parseContributionIntent('guardei 1250,50 na viagem do México');
    expect(intent!.amount).toBe(1250.5);
    expect(intent!.tokens).toEqual(['viagem', 'mexico']);
  });

  it('parses without an amount, keeping the goal words', () => {
    const intent = parseContributionIntent('aportei no btc');
    expect(intent!.amount).toBeUndefined();
    expect(intent!.tokens).toEqual(['btc']);
  });

  it('understands en and es openings, accents stripped', () => {
    expect(parseContributionIntent('saved 200 for the trip')!.tokens).toEqual(['trip']);
    expect(parseContributionIntent('Ahorré 300 para el fondo México')!.tokens).toEqual(['mexico']);
  });

  it('ignores messages that only mention saving mid-sentence', () => {
    expect(parseContributionIntent('mercado 50, depois aportei 500')).toBeNull();
    expect(parseContributionIntent('almoço 30 reais')).toBeNull();
  });

  it('drops goal-words and currency words from the tokens', () => {
    const intent = parseContributionIntent('aportei 100 dolares na meta caixinha emergência');
    expect(intent!.tokens).toEqual(['emergencia']);
  });
});

describe('matchGoals', () => {
  const goals = [
    { id: '1', name: 'Dólar' },
    { id: '2', name: 'Viagem México' },
    { id: '3', name: 'BTC' },
  ];

  it('matches when every token appears in the name, accent-free', () => {
    expect(matchGoals(goals, ['dolar'])).toEqual([goals[0]]);
    expect(matchGoals(goals, ['viagem', 'mexico'])).toEqual([goals[1]]);
  });

  it('refuses partial matches — a stray word means it is another subject', () => {
    expect(matchGoals(goals, ['viagem', 'europa'])).toEqual([]);
  });

  it('matches nothing without tokens', () => {
    expect(matchGoals(goals, [])).toEqual([]);
  });
});
