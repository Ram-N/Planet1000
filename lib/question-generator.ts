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

// Domain-aware directional hints for stock/flow questions (no answer revealed)
function stockHint(obs: Observation): string {
  const domain = obs.entity.domain;
  const entity = obs.entity.name.toLowerCase();
  if (domain === 'healthcare') {
    return `Healthcare workers take many years to train and are expensive to retain — consider how access differs between wealthy and low-income countries.`;
  }
  if (domain === 'education') {
    return `Think about school enrollment trends globally — and where the biggest gaps between rich and poor countries still remain.`;
  }
  if (domain === 'energy') {
    return `Electricity access and energy use are closely tied to income — the gap between the richest and poorest countries is enormous.`;
  }
  if (domain === 'water') {
    return `Safe water access has improved significantly but remains a major challenge — consider which regions still struggle most.`;
  }
  if (domain === 'money') {
    return `Global poverty and wealth are distributed very unevenly — think about what "average" really means across 8 billion people.`;
  }
  if (domain === 'food') {
    return `Agriculture still employs a huge share of workers in developing regions, even as mechanisation has reduced that number in wealthy countries.`;
  }
  if (domain === 'housing') {
    return `Rapid urbanisation has outpaced housing construction in many developing cities — slums and informal settlements are common.`;
  }
  if (domain === 'transportation') {
    return `Ownership and usage of vehicles is heavily concentrated in wealthy nations — consider how different life looks in low-income countries.`;
  }
  if (domain === 'environment') {
    return `Environmental pressures are driven by consumption — and consumption varies enormously between rich and poor countries.`;
  }
  // people domain — entity-specific
  if (entity.includes('child') || entity.includes('under 15')) {
    return `Birth rates in Africa and South Asia are much higher than in Europe or East Asia — the world is younger than you might think.`;
  }
  if (entity.includes('urban') || entity.includes('city')) {
    return `In 1960 only about 1 in 3 people lived in cities. That balance has now flipped, and cities keep growing.`;
  }
  if (entity.includes('internet') || entity.includes('smartphone')) {
    return `Connectivity has grown explosively but unevenly — large swathes of rural Africa and South Asia are still offline.`;
  }
  if (entity.includes('displaced') || entity.includes('refugee')) {
    return `Forced displacement has been rising for over a decade, driven by conflicts in Syria, South Sudan, Ukraine, and elsewhere.`;
  }
  return `Think about how this characteristic is distributed across Asia, Africa, and the Americas — which together hold most of humanity.`;
}

const TEMPLATES: QuestionTemplate[] = [

  // ── 1. Canonical "world of 1,000" framing ─────────────────────────────────
  {
    id: 'absolute_1k',
    pattern: 'absolute_1k',
    applies: (obs) => STOCK_FLOW.has(obs.metric.measure_type),
    prompt: (obs) =>
      `In a world of 1,000 people, how many would be: ${obs.entity.name}?`,
    hint: (obs, _per1k) => stockHint(obs),
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
    hint: (obs, _per1k) =>
      `Remember that about 60% of humanity lives in Asia alone. A truly random global sample looks very different from what you'd see in a wealthy country.`,
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
    hint: (obs, _per1k) =>
      `In wealthy countries this may be near-universal; in the world's poorest regions it can be very rare. The global average reflects the full spectrum.`,
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
    hint: (obs, _per1k) =>
      `Think about whether this number has been rising or falling — and by roughly how much — over the past 30 years.`,
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
    hint: (obs, _per1k) =>
      `Consider how ownership is concentrated — a small share of the world's countries account for the vast majority of vehicles.`,
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
    hint: (obs, _per1k) => {
      if (obs.entity.id === 'commercial-flights') {
        return `Flying is still largely a privilege of wealth — only a small fraction of people globally fly in any given year.`;
      }
      if (obs.entity.id === 'food-waste') {
        return `Wasted food is a massive problem in both rich and poor countries, though for different reasons — spoilage vs. consumer waste.`;
      }
      if (obs.entity.id === 'annual-forest-loss') {
        return `Deforestation is driven mainly by agriculture expansion — primarily in the Amazon, Congo Basin, and Southeast Asia.`;
      }
      return `Think about the global scale of this activity and how it's distributed across regions and income levels.`;
    },
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
      if (obs.unit.id === 'calories') return `How many calories of food are available per person per day globally?`;
      if (obs.unit.id === 'liters') return `How many liters of freshwater does the average person use per day?`;
      if (obs.unit.id === 'kwh') return `How many kWh of electricity does the average person use per year?`;
      if (obs.unit.id === 'usd-per-year') return `What is the global average GDP per capita (USD per year)?`;
      if (obs.unit.id === 'kg-co2') return `How many kg of CO₂ does the average person emit per year?`;
      return `What is the global average ${entity} per person?`;
    },
    hint: (obs, _per1k) => {
      if (obs.unit.id === 'years') return `Life expectancy has roughly doubled since 1900, but there's still a 25-year gap between the longest- and shortest-lived countries.`;
      if (obs.unit.id === 'calories') return `The world produces more than enough food to feed everyone — the problem is access and distribution, not total quantity.`;
      if (obs.unit.id === 'liters') return `Americans use around 500 liters a day; in some low-income countries people survive on under 20. The global average is somewhere between these extremes.`;
      if (obs.unit.id === 'kwh') return `Americans use roughly 4× the global average. Many people in sub-Saharan Africa use less than 200 kWh per year.`;
      if (obs.unit.id === 'usd-per-year') return `The global average is pulled up by wealthy countries — more than half the world's people earn far less than the average suggests.`;
      if (obs.unit.id === 'kg-co2') return `Americans emit about 3× the global average. People in the world's poorest countries emit a tiny fraction of that.`;
      return `This figure varies enormously between wealthy and low-income countries — think about where the global middle lands.`;
    },
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
    hint: (obs, _per1k) => {
      if (obs.unit.id === 'years') return `Japan leads at 84 years; some countries in sub-Saharan Africa are still below 60. The global average reflects the full spread.`;
      if (obs.unit.id === 'calories') return `Think about whether the world produces enough total food — and remember that "available" calories include what's wasted.`;
      if (obs.unit.id === 'kwh') return `Think about countries like Chad (~30 kWh/person/year) vs the USA (~12,000) — the global average lies far closer to the lower end.`;
      if (obs.unit.id === 'kg-co2') return `A long-haul flight emits roughly 1 tonne of CO₂ per passenger. Most people in the world have never flown.`;
      if (obs.unit.id === 'usd-per-year') return `Global GDP sounds large, but divided by 8 billion people and the per-person figure is much lower than wealthy-country incomes suggest.`;
      return `The real distribution is very unequal — think about where the majority of humanity, living in Asia and Africa, falls on this scale.`;
    },
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
    hint: (obs, _per1k) => {
      if (obs.entity.id === 'renewable-electricity') {
        return `Renewables have grown fast — wind and solar alone exceeded 13% of global electricity in 2023 — but fossil fuels still dominate.`;
      }
      if (obs.entity.id === 'top10-wealth-share') {
        return `Wealth is far more unequal than income. The bottom half of the world owns very little — think about what the top 10% might hold.`;
      }
      return `Think about how concentrated or evenly distributed this characteristic tends to be globally.`;
    },
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
    hint: (obs, _per1k) => {
      if (obs.entity.id === 'renewable-electricity') {
        return `Hydro has been around for a century; wind and solar are the fast-growing newcomers. Together, where does that put renewables?`;
      }
      if (obs.entity.id === 'top10-wealth-share') {
        return `In most countries the wealthiest tenth own more than you'd expect. At the global level, that concentration is even more extreme.`;
      }
      return `Consider whether this is something concentrated among a few or spread widely across the population.`;
    },
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
