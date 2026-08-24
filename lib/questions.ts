import { worldModel } from './world-model-instance';
import { generateAllQuestions } from './question-generator';
import type { Question, WorldStat, Domain, Dimension } from '@/types';
import type { Observation } from '@/types/world-model';

// ---------------------------------------------------------------------------
// Adapter: convert a WorldModel Observation to the legacy WorldStat shape.
// This keeps existing game pages working without changes.
// ---------------------------------------------------------------------------

const METRIC_TO_DIMENSION: Record<string, Dimension> = {
  'population-count': 'how many',
  'object-count': 'how many',
  'daily-flow': 'how many',
  'annual-flow': 'how much',
  'per-capita-daily': 'per person',
  'per-capita-annual': 'per person',
  'percentage-share': 'rate',
};

function observationToWorldStat(obs: Observation): WorldStat {
  const value_1k = worldModel.per1k(obs);
  return {
    id: obs.id,
    domain: obs.entity.domain as Domain,
    dimension: (METRIC_TO_DIMENSION[obs.metric_id] ?? 'how many') as Dimension,
    label: obs.entity.name,
    value_1k,
    value_world: obs.value,
    unit: obs.unit.symbol,
    explanation: obs.notes,
  };
}

// ---------------------------------------------------------------------------
// Public API — same shape as the old questions.ts for backward compatibility
// ---------------------------------------------------------------------------

let _allQuestions: Question[] | null = null;

export function getAllQuestions(): Question[] {
  if (!_allQuestions) {
    _allQuestions = generateAllQuestions(worldModel);
  }
  return _allQuestions;
}

export function getStatById(id: string): WorldStat | undefined {
  const obs = worldModel.getObservationById(id);
  return obs ? observationToWorldStat(obs) : undefined;
}

export function getQuestionWithStat(
  questionId: string
): { question: Question; stat: WorldStat } | null {
  const question = getAllQuestions().find((q) => q.id === questionId);
  if (!question) return null;
  const stat = getStatById(question.statId);
  if (!stat) return null;
  return { question, stat };
}

/** Fisher-Yates shuffle — returns a new shuffled array */
export function shuffleQuestions(qs: Question[]): Question[] {
  const arr = [...qs];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getShuffledQuestions(): Question[] {
  return shuffleQuestions(getAllQuestions());
}
