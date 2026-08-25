/**
 * schedule — Preview the Planet1000 daily question schedule for the next N days.
 *
 * Replicates the exact getDailyQuestions() algorithm from lib/questions.ts so
 * that predicted dates always match what the game actually shows.
 *
 * Usage:
 *   npx tsx scripts/schedule.ts               (next 7 days, print only)
 *   npx tsx scripts/schedule.ts --write        (also write data/schedule.json)
 *   npx tsx scripts/schedule.ts --days 14      (override count)
 *   npx tsx scripts/schedule.ts --write --days 14
 */

import * as fs   from 'fs';
import * as path from 'path';

// ── Paths ──────────────────────────────────────────────────────────────────────

const WORLD_MODEL_PATH = path.join(__dirname, '../data/generated/world-model.json');
const SCHEDULE_PATH    = path.join(__dirname, '../data/schedule.json');

// ── Template applies conditions ────────────────────────────────────────────────
// Must exactly match the TEMPLATES array in lib/question-generator.ts.

type Obs = {
  id: string;
  entity: { id: string; name: string; domain: string };
  metric: { id: string; measure_type: string };
  unit: { id: string };
  value: number;
  notes: string;
  facts: { type: 'relationship' | 'anchor'; text: string }[];
};

const TEMPLATES: { id: string; applies: (o: Obs) => boolean }[] = [
  { id: 'absolute_1k',            applies: o => o.metric.measure_type === 'stock' || o.metric.measure_type === 'flow' },
  { id: 'absolute_1k_gather',     applies: o => o.metric.measure_type === 'stock' },
  { id: 'absolute_1k_inequality', applies: o => o.metric.measure_type === 'stock' && ['healthcare','education','money','energy','water'].includes(o.entity.domain) },
  { id: 'absolute_1k_context',    applies: o => o.metric.measure_type === 'stock' && ['people','healthcare','food','housing'].includes(o.entity.domain) },
  { id: 'absolute_1k_objects',    applies: o => o.metric.measure_type === 'stock' && o.entity.domain === 'transportation' },
  { id: 'absolute_1k_flow',       applies: o => o.metric.measure_type === 'flow' },
  { id: 'per_person',             applies: o => o.metric.measure_type === 'rate' },
  { id: 'per_person_alt',         applies: o => o.metric.measure_type === 'rate' },
  { id: 'world_scale',            applies: o => o.metric.measure_type === 'share' },
  { id: 'world_scale_alt',        applies: o => o.metric.measure_type === 'share' },
];

// ── Date hash (same algorithm as getDailyQuestions in lib/questions.ts) ────────

function dateHash(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

function isoDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

// ── Question pool (mirrors getDailyQuestions sort order) ───────────────────────

interface PoolEntry {
  qId:      string;
  obsId:    string;
  template: string;
}

function buildPool(observations: Obs[]): PoolEntry[] {
  const pool: PoolEntry[] = [];
  const seen = new Set<string>();

  for (const obs of observations) {
    for (const tmpl of TEMPLATES) {
      if (!tmpl.applies(obs)) continue;
      const qId = `gen-${tmpl.id}-${obs.id}`;
      if (seen.has(qId)) continue;
      seen.add(qId);
      pool.push({ qId, obsId: obs.id, template: tmpl.id });
    }
  }

  pool.sort((a, b) => a.qId.localeCompare(b.qId));
  return pool;
}

function pickForDate(pool: PoolEntry[], dateStr: string): PoolEntry {
  const idx = dateHash(dateStr) % pool.length;
  return pool[idx];
}

// ── Fact analysis ──────────────────────────────────────────────────────────────

interface FactCounts { r: number; a: number }

function countFacts(obs: Obs): FactCounts {
  return {
    r: obs.facts.filter(f => f.type === 'relationship').length,
    a: obs.facts.filter(f => f.type === 'anchor').length,
  };
}

type Priority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'OK';

interface Recommendation {
  priority: Priority;
  gap:      string;
  action:   string;
}

function recommend(obs: Obs, counts: FactCounts, daysUntil: number): Recommendation {
  const { r, a } = counts;
  const soon = daysUntil <= 2;  // featured within 48 h → escalate priority

  // No facts at all — players get zero hints
  if (r === 0 && a === 0) {
    return {
      priority: 'URGENT',
      gap:      'No facts — players will see no hints',
      action:   `hunt then add both types:\n    npx tsx scripts/fact-hunt.ts hunt ${obs.id}\n    npx tsx scripts/fact-hunt.ts add ${obs.id}`,
    };
  }

  // Missing both types but has some
  if (r < 2 && a < 2) {
    return {
      priority: soon ? 'HIGH' : 'MEDIUM',
      gap:      `Only R:${r} A:${a} — needs ${2 - r}R + ${2 - a}A`,
      action:   `npx tsx scripts/fact-hunt.ts add ${obs.id}`,
    };
  }

  // Anchors are used first (THINK phase) — prioritise them
  if (a < 2) {
    return {
      priority: soon ? 'HIGH' : 'MEDIUM',
      gap:      `A:${a} — needs ${2 - a} more anchor (concrete country figure)`,
      action:   `npx tsx scripts/fact-hunt.ts add ${obs.id}`,
    };
  }

  // Relationship facts feed the REFINE phase
  if (r < 2) {
    return {
      priority: soon ? 'MEDIUM' : 'LOW',
      gap:      `R:${r} — needs ${2 - r} more relationship (ratio/trend/comparison)`,
      action:   `npx tsx scripts/fact-hunt.ts add ${obs.id}`,
    };
  }

  return { priority: 'OK', gap: '', action: '' };
}

// ── Schedule entry ─────────────────────────────────────────────────────────────

interface ScheduleDay {
  date:           string;
  question_id:    string;
  observation_id: string;
  entity:         string;
  domain:         string;
  template:       string;
  facts:          { relationship: number; anchor: number; total: number };
  priority:       Priority;
  gap:            string;
  action:         string;
}

// ── Terminal output ────────────────────────────────────────────────────────────

const PRIORITY_ICON: Record<Priority, string> = {
  URGENT: '✗✗',
  HIGH:   '✗ ',
  MEDIUM: '⚠ ',
  LOW:    '△ ',
  OK:     '✓ ',
};

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function printSchedule(days: ScheduleDay[], poolSize: number): void {
  const today = days[0]?.date ?? '?';
  console.log(`\n── Planet1000 Daily Schedule from ${today} ──────────────────────────`);
  console.log(`   Pool: ${poolSize} question variants across ${new Set(days.map(d => d.observation_id)).size} distinct observations`);
  console.log('');

  const COL = { date: 12, id: 38, entity: 46, facts: 10 };

  // Header
  console.log(
    '   ' +
    pad('Date', COL.date) +
    pad('Observation', COL.id) +
    pad('Entity (domain)', COL.entity) +
    'Facts   Priority'
  );
  console.log('   ' + '─'.repeat(COL.date + COL.id + COL.entity + 26));

  for (const day of days) {
    const facts = `R:${day.facts.relationship} A:${day.facts.anchor}`;
    const icon  = PRIORITY_ICON[day.priority];
    console.log(
      ` ${icon} ` +
      pad(day.date, COL.date) +
      pad(day.observation_id, COL.id) +
      pad(`${day.entity} (${day.domain})`, COL.entity) +
      pad(facts, COL.facts) +
      day.priority
    );
  }

  // Recommendations section
  const needsWork = days.filter(d => d.priority !== 'OK');
  if (needsWork.length === 0) {
    console.log('\n✓ All featured observations have good fact coverage.\n');
    return;
  }

  console.log('\n── Recommendations ──────────────────────────────────────────────────\n');

  // Sort by priority severity
  const PORDER: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
  const sorted = [...needsWork].sort(
    (a, b) => PORDER.indexOf(a.priority) - PORDER.indexOf(b.priority)
  );

  for (const day of sorted) {
    const daysUntil = days.indexOf(day);
    const when = daysUntil === 0 ? 'TODAY' : `in ${daysUntil} day${daysUntil === 1 ? '' : 's'} (${day.date})`;
    console.log(`[${day.priority}] ${day.entity} — featured ${when}`);
    console.log(`  Gap:    ${day.gap}`);
    console.log(`  Fix:    ${day.action}`);
    console.log('');
  }
}

// ── Entry point ────────────────────────────────────────────────────────────────

const argv     = process.argv.slice(2);
const doWrite  = argv.includes('--write');
const daysArg  = argv.indexOf('--days');
const N        = daysArg !== -1 && argv[daysArg + 1] ? parseInt(argv[daysArg + 1], 10) : 7;

if (isNaN(N) || N < 1) {
  console.error('✗ --days must be a positive integer');
  process.exit(1);
}

// Load world model
if (!fs.existsSync(WORLD_MODEL_PATH)) {
  console.error(`✗ world-model.json not found. Run npm run build:data first.`);
  process.exit(1);
}

const wm: { observations: Obs[]; world_population: number } =
  JSON.parse(fs.readFileSync(WORLD_MODEL_PATH, 'utf-8'));

const pool = buildPool(wm.observations);
const obsMap = new Map<string, Obs>(wm.observations.map(o => [o.id, o]));

// Build schedule
const days: ScheduleDay[] = [];

for (let i = 0; i < N; i++) {
  const dateStr = isoDate(i);
  const pick    = pickForDate(pool, dateStr);
  const obs     = obsMap.get(pick.obsId)!;
  const counts  = countFacts(obs);
  const rec     = recommend(obs, counts, i);

  days.push({
    date:           dateStr,
    question_id:    pick.qId,
    observation_id: obs.id,
    entity:         obs.entity.name,
    domain:         obs.entity.domain,
    template:       pick.template,
    facts:          { relationship: counts.r, anchor: counts.a, total: counts.r + counts.a },
    priority:       rec.priority,
    gap:            rec.gap,
    action:         rec.action,
  });
}

printSchedule(days, pool.length);

if (doWrite) {
  const out = {
    generated:  new Date().toISOString(),
    pool_size:  pool.length,
    days,
  };
  fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`✓ Written to data/schedule.json\n`);
}
