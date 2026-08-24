/**
 * Question Generator
 *
 * Generates Question objects from WorldModel Observations using templates.
 * Each observation yields multiple question variants, replacing static questions.json.
 */

import type { Observation } from '@/types/world-model';
import type { Question } from '@/types';

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

type TemplatePattern =
  | 'absolute_1k'
  | 'absolute_1k_gather'
  | 'absolute_1k_inequality'
  | 'absolute_1k_context'
  | 'percentage'
  | 'per_person'
  | 'per_person_alt'
  | 'world_scale';

interface QuestionTemplate {
  id: string;
  pattern: TemplatePattern;
  applies: (obs: Observation) => boolean;
  prompt: (obs: Observation) => string;
  hint: (obs: Observation, per1k: number) => string;
  reasoningOptions: (obs: Observation) => string[];
}

const STOCK_FLOW = new Set(['stock', 'flow']);

/** Format a number for display in hints */
function fmt(n: number): string {
  if (n >= 1000) return Math.round(n).toLocaleString();
  if (n >= 100) return Math.round(n).toString();
  if (n >= 10) return n.toFixed(1);
  if (n >= 1) return n.toFixed(1);
  return n.toFixed(2);
}

const TEMPLATES: QuestionTemplate[] = [

  // ── 1. Canonical "world of 1,000" framing ─────────────────────────────────
  {
    id: 'absolute_1k',
    pattern: 'absolute_1k',
    applies: (obs) => STOCK_FLOW.has(obs.metric.measure_type),
    prompt: (obs) =>
      `In a world of 1,000 people, how many would be: ${obs.entity.name}?`,
    hint: (obs, per1k) =>
      `Think about what fraction of the global population this represents. The answer is around ${fmt(per1k)} ${obs.unit.symbol}.`,
    reasoningOptions: (obs) => [
      `I know roughly how common ${obs.entity.name.toLowerCase()} are globally`,
      `I estimated from ${obs.entity.domain} data or news I know`,
      `I compared it to figures from my own country`,
      'Pure guess',
    ],
  },

  // ── 2. "Gather 1,000 random people" framing ───────────────────────────────
  {
    id: 'absolute_1k_gather',
    pattern: 'absolute_1k_gather',
    applies: (obs) => obs.metric.measure_type === 'stock',
    prompt: (obs) =>
      `If you gathered 1,000 completely random people from around the world, roughly how many would be ${obs.entity.name.toLowerCase()}?`,
    hint: (obs, per1k) =>
      `Consider how this group is distributed globally — across all countries, incomes, and ages. About ${fmt(per1k)} out of 1,000 would fit this description.`,
    reasoningOptions: (obs) => [
      `I know this global proportion from statistics or reports`,
      `I thought about the distribution across rich and poor countries`,
      `I guessed based on what's common in places I know`,
      'Pure guess',
    ],
  },

  // ── 3. Inequality-aware framing ───────────────────────────────────────────
  {
    id: 'absolute_1k_inequality',
    pattern: 'absolute_1k_inequality',
    applies: (obs) =>
      obs.metric.measure_type === 'stock' &&
      ['healthcare', 'education', 'money', 'energy', 'water'].includes(obs.entity.domain),
    prompt: (obs) =>
      `Access to ${obs.entity.name.toLowerCase()} is very unequal globally. In a 1,000-person world, how many people have it?`,
    hint: (obs, per1k) =>
      `Think about the gap between wealthy nations (where this is common) and low-income countries (where it may be rare). The global average: about ${fmt(per1k)} per 1,000.`,
    reasoningOptions: (obs) => [
      `I estimated from the gap between rich and poor countries`,
      `I know the global average for ${obs.entity.domain} access`,
      `I guessed based on news about global inequality`,
      'Pure guess',
    ],
  },

  // ── 4. Context / trend framing ────────────────────────────────────────────
  {
    id: 'absolute_1k_context',
    pattern: 'absolute_1k_context',
    applies: (obs) =>
      obs.metric.measure_type === 'stock' &&
      ['people', 'healthcare', 'food', 'housing'].includes(obs.entity.domain),
    prompt: (obs) =>
      `Global trends have changed rapidly in recent decades. In today's world of 1,000, how many are ${obs.entity.name.toLowerCase()}?`,
    hint: (obs, per1k) =>
      `Consider how this number has changed over time — and where it's heading. Currently about ${fmt(per1k)} per 1,000.`,
    reasoningOptions: (obs) => [
      `I know how this trend has changed in recent decades`,
      `I estimated from development goals or UN reports I've seen`,
      `I thought about where the biggest changes have happened`,
      'Pure guess',
    ],
  },

  // ── 5. Object count framing ───────────────────────────────────────────────
  {
    id: 'absolute_1k_objects',
    pattern: 'absolute_1k',
    applies: (obs) =>
      obs.metric.measure_type === 'stock' &&
      obs.entity.domain === 'transportation',
    prompt: (obs) =>
      `How many ${obs.entity.name.toLowerCase()} would exist in a world scaled down to 1,000 people?`,
    hint: (obs, per1k) =>
      `Scale everything proportionally: the real world total maps to about ${fmt(per1k)} ${obs.unit.symbol} in a 1,000-person world.`,
    reasoningOptions: (obs) => [
      `I know roughly how many ${obs.entity.name.toLowerCase()} exist per person globally`,
      `I estimated from production statistics or news`,
      `I compared to ownership rates in countries I know`,
      'Pure guess',
    ],
  },

  // ── 6. Flow / daily or annual volume ─────────────────────────────────────
  {
    id: 'absolute_1k_flow',
    pattern: 'absolute_1k',
    applies: (obs) => obs.metric.measure_type === 'flow',
    prompt: (obs) => {
      if (obs.metric.id === 'daily-flow') {
        return `In a 1,000-person world, how many ${obs.entity.name.toLowerCase()} occur each day?`;
      }
      return `In a 1,000-person world, how much ${obs.entity.name.toLowerCase()} happens each year?`;
    },
    hint: (obs, per1k) =>
      `Scale the real-world total proportionally. In a 1,000-person world, the answer is about ${fmt(per1k)} ${obs.unit.symbol}.`,
    reasoningOptions: (obs) => [
      `I know roughly the global volume of ${obs.entity.name.toLowerCase()}`,
      `I estimated from consumption or production rates I know`,
      `I guessed based on what I know about global demand`,
      'Pure guess',
    ],
  },

  // ── 7. Per-person rate (primary) ──────────────────────────────────────────
  {
    id: 'per_person',
    pattern: 'per_person',
    applies: (obs) => obs.metric.measure_type === 'rate',
    prompt: (obs) => {
      const entity = obs.entity.name.toLowerCase();
      if (obs.unit.id === 'years') return `What is the global average ${entity}?`;
      if (obs.unit.id === 'calories') return `How many ${obs.unit.name.toLowerCase()} of food are available per person per day globally?`;
      if (obs.unit.id === 'liters') return `How many liters of freshwater does the average person use per day?`;
      if (obs.unit.id === 'kwh') return `How many kWh of electricity does the average person use per year?`;
      if (obs.unit.id === 'usd-per-year') return `What is the global average GDP per capita (USD per year)?`;
      if (obs.unit.id === 'kg-co2') return `How many kg of CO₂ does the average person emit per year?`;
      return `What is the global average ${entity} per person?`;
    },
    hint: (obs, per1k) =>
      `This figure applies equally to every person in our 1,000-person world. The global average is about ${fmt(per1k)} ${obs.unit.symbol}.`,
    reasoningOptions: (obs) => [
      `I know the global average ${obs.entity.name.toLowerCase()} from data or reports`,
      `I estimated from the contrast between wealthy and developing countries`,
      `I guessed based on my own experience or country`,
      'Pure guess',
    ],
  },

  // ── 8. Per-person rate (alternate framing) ────────────────────────────────
  {
    id: 'per_person_alt',
    pattern: 'per_person_alt',
    applies: (obs) => obs.metric.measure_type === 'rate',
    prompt: (obs) => {
      if (obs.unit.id === 'years') {
        return `A baby born anywhere in the world today can expect to live how many years on average?`;
      }
      if (obs.unit.id === 'calories') {
        return `On average, how many calories of food exist per person per day in the global food system?`;
      }
      if (obs.unit.id === 'kwh') {
        return `Averaged across all 8 billion people, how many kWh does each person consume per year?`;
      }
      if (obs.unit.id === 'kg-co2') {
        return `If CO₂ emissions were divided equally among all people, what would each person's annual share be (in kg)?`;
      }
      if (obs.unit.id === 'usd-per-year') {
        return `If global GDP were divided equally, what would each person receive per year (in USD)?`;
      }
      return `What is the per-person global average for ${obs.entity.name.toLowerCase()}?`;
    },
    hint: (obs, per1k) =>
      `Divide the world total equally. The result is ${fmt(per1k)} ${obs.unit.symbol} per person — though real distribution is very unequal.`,
    reasoningOptions: () => [
      'I know the global per-capita figure from news or studies',
      'I estimated from totals and world population',
      'I adjusted from my own country\'s figure',
      'Pure guess',
    ],
  },

  // ── 9. Share / percentage ─────────────────────────────────────────────────
  {
    id: 'world_scale',
    pattern: 'world_scale',
    applies: (obs) => obs.metric.measure_type === 'share',
    prompt: (obs) => {
      if (obs.entity.id === 'renewable-electricity') {
        return `Out of every 1,000 kWh of electricity generated globally, how many come from renewable sources?`;
      }
      if (obs.entity.id === 'top10-wealth-share') {
        return `If all global wealth were split into 1,000 equal units, how many would the richest 10% own?`;
      }
      return `Out of every 1,000 units of ${obs.entity.name.toLowerCase()}, how many fit this description?`;
    },
    hint: (obs, per1k) =>
      `Think in proportions. The answer is about ${fmt(per1k)} out of every 1,000.`,
    reasoningOptions: () => [
      'I know roughly what share this represents from reports or news',
      'I estimated from trends in this area over recent years',
      'I guessed based on proportional reasoning',
      'Pure guess',
    ],
  },

  // ── 10. Share (alternate framing) ─────────────────────────────────────────
  {
    id: 'world_scale_alt',
    pattern: 'world_scale',
    applies: (obs) => obs.metric.measure_type === 'share',
    prompt: (obs) => {
      if (obs.entity.id === 'renewable-electricity') {
        return `What percentage of global electricity currently comes from renewable sources (wind, solar, hydro, etc.)?`;
      }
      if (obs.entity.id === 'top10-wealth-share') {
        return `What percentage of the world's total wealth is owned by the richest 10% of people?`;
      }
      return `What percentage of global ${obs.entity.name.toLowerCase()} fits this category?`;
    },
    hint: (obs, per1k) =>
      `The answer is ${(per1k / 10).toFixed(1)}% — or ${fmt(per1k)} per 1,000.`,
    reasoningOptions: () => [
      'I know this percentage from following energy or economic news',
      'I estimated from the rate of change in recent years',
      'I guessed based on what feels roughly right',
      'Pure guess',
    ],
  },
];

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export interface GenerateOptions {
  domain?: string;
  worldModel: {
    per1k: (obs: Observation) => number;
    queryObservations: (filter: { domain?: string }) => Observation[];
  };
}

export function generateQuestions(options: GenerateOptions): Question[] {
  const { domain, worldModel } = options;
  const observations = worldModel.queryObservations(domain ? { domain } : {});

  const questions: Question[] = [];
  const seenIds = new Set<string>();

  for (const obs of observations) {
    const per1k = worldModel.per1k(obs);

    for (const template of TEMPLATES) {
      if (!template.applies(obs)) continue;

      const qId = `gen-${template.id}-${obs.id}`;
      if (seenIds.has(qId)) continue;
      seenIds.add(qId);

      questions.push({
        id: qId,
        statId: obs.id,
        prompt: template.prompt(obs),
        hint: template.hint(obs, per1k),
        reasoningOptions: template.reasoningOptions(obs),
      });
    }
  }

  return questions;
}

/** Generate questions for all domains (used as the default question pool). */
export function generateAllQuestions(worldModel: GenerateOptions['worldModel']): Question[] {
  return generateQuestions({ worldModel });
}
