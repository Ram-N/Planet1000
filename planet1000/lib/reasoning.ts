import type { ReasoningQuality } from '@/types';

/**
 * Maps reasoning option indices to quality levels.
 * Convention (from questions.json): first 2 options are 'strong', last 2 are 'moderate'/'weak'.
 * The last option ("Pure guess") is always weak.
 */
export function getReasoningQuality(
  options: string[],
  selectedIndex: number
): ReasoningQuality {
  const last = options.length - 1;
  if (selectedIndex === last) return 'weak';       // "Pure guess"
  if (selectedIndex === last - 1) return 'moderate'; // "estimated from..."
  return 'strong'; // first options indicate domain knowledge
}

export function getReasoningFeedback(quality: ReasoningQuality): string {
  switch (quality) {
    case 'strong':
      return 'Strong reasoning — you used relevant knowledge to anchor your estimate.';
    case 'moderate':
      return 'Decent approach — using estimation by analogy is a good strategy.';
    case 'weak':
      return 'Even a pure guess is a starting point. Try to anchor to something you know next time.';
  }
}
