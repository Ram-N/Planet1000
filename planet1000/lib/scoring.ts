/**
 * Proximity-based scoring: rewards closeness to the actual answer.
 *
 * guessNumber controls the maximum points available:
 *   1 (cold, no hints)     → up to 100 pts
 *   2 (after hint 1)       → up to  40 pts
 *   3 (after hint 2)       → up to  15 pts
 *
 * Defaults to guessNumber=1 for backward compatibility with existing game pages.
 */

const MAX_BY_GUESS = { 1: 100, 2: 40, 3: 15 } as const;

export function scoreEstimate(
  guess: number,
  actual: number,
  guessNumber: 1 | 2 | 3 = 1,
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
