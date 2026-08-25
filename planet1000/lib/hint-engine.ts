/**
 * Hint Engine for the Planet1000 weekly 4-guess challenge.
 *
 * Hint 1 (after Guess 1): relationship facts — comparative context, no world totals
 * Hint 2 (after Guess 2): temporal facts — direction and trend over time
 * Hint 3 (after Guess 3): anchor facts — concrete numerical scale, best calibration before final guess
 *
 * Fact selection is type-based, with fallback to any unused fact.
 */

import type { Fact } from '@/types/world-model';

export interface HintResponse {
  preamble: string | null;
  facts: string[];
  /** Indices into the facts array that were used — pass as usedIndices to the next call */
  selectedIndices: number[];
}

function pickByType(
  facts: Fact[],
  preferredType: Fact['type'],
  usedIndices: number[],
  wantCount: number,
): number[] {
  const picked: number[] = [];

  // First: facts of the preferred type that haven't been used
  for (let i = 0; i < facts.length; i++) {
    if (picked.length >= wantCount) break;
    if (!usedIndices.includes(i) && facts[i].type === preferredType) {
      picked.push(i);
    }
  }

  // Fallback: any unused fact (any type)
  if (picked.length < wantCount) {
    for (let i = 0; i < facts.length; i++) {
      if (picked.length >= wantCount) break;
      if (!usedIndices.includes(i) && !picked.includes(i)) {
        picked.push(i);
      }
    }
  }

  return picked;
}

function buildPreamble(guess: number, actual: number): string {
  if (actual === 0) return 'The actual value is zero.';

  const ratio = guess / actual;
  const direction = guess > actual ? 'high' : 'low';
  const r = ratio > 1 ? ratio : 1 / ratio;

  if (r > 10) return `Your estimate is dramatically too ${direction}.`;
  if (r > 5)  return `Your estimate is considerably too ${direction}.`;
  if (r >= 2) return `You're about ${r.toFixed(1)}× too ${direction}.`;
  if (r >= 1.3) return `You're somewhat too ${direction}.`;
  return `You're very close — but slightly too ${direction}.`;
}

export function selectHint(
  guess: number,
  actual: number,
  facts: Fact[],
  guessNumber: 1 | 2 | 3,
  usedIndices: number[],
): HintResponse {
  if (guessNumber === 1) {
    // After Guess 1: relationship facts — broad comparative context, no preamble
    const selectedIndices = pickByType(facts, 'relationship', usedIndices, 2);
    return {
      preamble: null,
      facts: selectedIndices.map((i) => facts[i].text),
      selectedIndices,
    };
  } else if (guessNumber === 2) {
    // After Guess 2: temporal facts — direction and trend over time
    const preamble = buildPreamble(guess, actual);
    const selectedIndices = pickByType(facts, 'temporal', usedIndices, 1);
    return {
      preamble,
      facts: selectedIndices.map((i) => facts[i].text),
      selectedIndices,
    };
  } else {
    // After Guess 3: anchor facts — concrete number, best calibration before final guess
    const preamble = buildPreamble(guess, actual);
    const selectedIndices = pickByType(facts, 'anchor', usedIndices, 1);
    return {
      preamble,
      facts: selectedIndices.map((i) => facts[i].text),
      selectedIndices,
    };
  }
}
