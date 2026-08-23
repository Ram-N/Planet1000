/**
 * Proximity-based scoring: rewards closeness to the actual answer.
 * Returns points (0–100) and a label.
 */
export function scoreEstimate(
  guess: number,
  actual: number
): { points: number; label: string; percentOff: number } {
  if (actual === 0) {
    const points = guess === 0 ? 100 : 0;
    return { points, label: points === 100 ? 'Perfect!' : 'Missed', percentOff: 0 };
  }

  const percentOff = Math.abs(guess - actual) / actual;

  let points: number;
  let label: string;

  if (percentOff <= 0.05) {
    points = 100;
    label = 'Outstanding!';
  } else if (percentOff <= 0.10) {
    points = 75;
    label = 'Excellent!';
  } else if (percentOff <= 0.25) {
    points = 50;
    label = 'Good';
  } else if (percentOff <= 0.50) {
    points = 25;
    label = 'Getting there';
  } else {
    points = 5;
    label = 'Wide of the mark';
  }

  return { points, label, percentOff };
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
