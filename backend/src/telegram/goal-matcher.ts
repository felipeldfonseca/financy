import { normalizeForMatch } from './payment-intent';

export interface MatchableGoal {
  id: string;
  name: string;
}

/**
 * Which active goals a saving message is talking about. Strict on purpose:
 * every meaningful word must appear in the goal's name, because a false match
 * would hijack an ordinary message into "deposit into this goal?".
 */
export function matchGoals<T extends MatchableGoal>(goals: T[], tokens: string[]): T[] {
  if (tokens.length === 0) {
    return [];
  }

  return goals.filter((goal) => {
    const haystack = normalizeForMatch(goal.name);
    return tokens.every((token) => haystack.includes(token));
  });
}
