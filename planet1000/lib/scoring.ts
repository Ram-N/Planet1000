/**
 * Proximity-based scoring: rewards closeness to the actual answer.
 *
 * guessNumber controls the maximum points available (weekly 4-guess system):
 *   1 (cold, no hints)          → up to 100 pts
 *   2 (after relationship hint) → up to  75 pts
 *   3 (after temporal hint)     → up to  50 pts
 *   4 (after scale hint)       → up to  25 pts
 *
 * Max possible score per puzzle = 250 pts.
 * Defaults to guessNumber=1 for backward compatibility with existing game pages.
 */

const MAX_BY_GUESS = { 1: 100, 2: 75, 3: 50, 4: 25 } as const;

export function scoreEstimate(
  guess: number,
  actual: number,
  guessNumber: 1 | 2 | 3 | 4 = 1,
): { points: number; label: string; percentOff: number } {
  const maxPoints = MAX_BY_GUESS[guessNumber];

  if (actual === 0) {
    const points = guess === 0 ? maxPoints : 0;
    return { points, label: points === maxPoints ? 'Perfect!' : 'Missed', percentOff: 0 };
  }

  const percentOff = Math.abs(guess - actual) / actual;

  let fraction: number;
  let label: string;

  if (percentOff <= 0.05) {
    fraction = 1.0;
    label = 'Outstanding!';
  } else if (percentOff <= 0.10) {
    fraction = 0.75;
    label = 'Excellent!';
  } else if (percentOff <= 0.25) {
    fraction = 0.5;
    label = 'Good';
  } else if (percentOff <= 0.50) {
    fraction = 0.25;
    label = 'Getting there';
  } else {
    fraction = 0.05;
    label = 'Wide of the mark';
  }

  return { points: Math.round(maxPoints * fraction), label, percentOff };
}

export function scoreReasoning(quality: 'strong' | 'moderate' | 'weak'): number {
  switch (quality) {
    case 'strong': return 20;
    case 'moderate': return 10;
    case 'weak': return 0;
  }
}

export function formatScore(score: number): string {
  return score.toLocaleString();
}
