/**
 * Hint Engine for the Planet1000 adaptive 3-guess challenge.
 *
 * THINK phase (guessNumber=1): no directional preamble — give educational facts only.
 * REFINE phase (guessNumber=2): directional preamble based on error magnitude + one more fact.
 *
 * Facts in the pool are ordered by type:
 *   [0,1] scale_anchor / geographic   → preferred for THINK phase
 *   [2,3] inequality / comparison      → preferred for REFINE phase
 *   [4+]  trend / general              → fallbacks
 */

export interface HintResponse {
  preamble: string | null;
  facts: string[];
  /** Indices into the facts array that were used — pass as usedIndices to the next call */
  selectedIndices: number[];
}

function pickIndices(
  facts: string[],
  preferred: number[],
  usedIndices: number[],
  wantCount: number,
): number[] {
  const picked: number[] = [];

  // Try preferred indices first
  for (const idx of preferred) {
    if (picked.length >= wantCount) break;
    if (idx < facts.length && !usedIndices.includes(idx)) {
      picked.push(idx);
    }
  }

  // Fallback: any remaining unused index
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
  facts: string[],
  guessNumber: 1 | 2,
  usedIndices: number[],
): HintResponse {
  if (guessNumber === 1) {
    // THINK phase: no preamble; prefer indices 0 and 1 (scale_anchor / geographic)
    const selectedIndices = pickIndices(facts, [0, 1], usedIndices, 2);
    return {
      preamble: null,
      facts: selectedIndices.map((i) => facts[i]),
      selectedIndices,
    };
  } else {
    // REFINE phase: directional preamble + 1 fact from indices 2,3 (inequality / comparison)
    const preamble = buildPreamble(guess, actual);
    const selectedIndices = pickIndices(facts, [2, 3], usedIndices, 1);
    return {
      preamble,
      facts: selectedIndices.map((i) => facts[i]),
      selectedIndices,
    };
  }
}
