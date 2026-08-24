/**
 * Hint Engine for the Planet1000 adaptive 3-guess challenge.
 *
 * THINK phase (guessNumber=1): no directional preamble — show relationship facts
 *   (comparisons, ratios, historical trends; never a world total that divides to the answer).
 * REFINE phase (guessNumber=2): directional preamble + one anchor fact
 *   (a partial number for one region/group, not the global total).
 *
 * Fact selection is type-based:
 *   relationship → preferred for THINK phase
 *   anchor       → preferred for REFINE phase
 *   Either type → fallback if preferred type is exhausted
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
  // How many times off (always ≥ 1)
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
  guessNumber: 1 | 2,
  usedIndices: number[],
): HintResponse {
  if (guessNumber === 1) {
    // THINK phase: no preamble; prefer relationship facts (2 of them)
    const selectedIndices = pickByType(facts, 'relationship', usedIndices, 2);
    return {
      preamble: null,
      facts: selectedIndices.map((i) => facts[i].text),
      selectedIndices,
    };
  } else {
    // REFINE phase: directional preamble + 1 anchor fact
    const preamble = buildPreamble(guess, actual);
    const selectedIndices = pickByType(facts, 'anchor', usedIndices, 1);
    return {
      preamble,
      facts: selectedIndices.map((i) => facts[i].text),
      selectedIndices,
    };
  }
}
