/**
 * fact-hunt — Creator tool for growing the Planet1000 fact universe.
 *
 * Usage:
 *   npx tsx scripts/fact-hunt.ts status
 *   npx tsx scripts/fact-hunt.ts hunt [observation-id]
 *   npx tsx scripts/fact-hunt.ts add [observation-id]
 *
 * This script reads and writes world-model.json directly.
 * It is a creator-only tool — not shipped to players.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Fact {
  text: string;
  type: 'relationship' | 'anchor';
}

interface Observation {
  id: string;
  entity: { name: string; domain: string };
  metric: { name: string; measure_type: string };
  value: number;
  unit: { symbol: string };
  notes: string;
  facts: Fact[];
}

interface WorldModelData {
  observations: Observation[];
  world_population: number;
}

// ── Data helpers ───────────────────────────────────────────────────────────────

const DATA_PATH = path.join(__dirname, '../data/generated/world-model.json');

function loadData(): WorldModelData {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function saveData(data: WorldModelData): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
}

function per1k(obs: Observation, worldPop: number): number {
  if (obs.metric.measure_type === 'rate' || obs.metric.measure_type === 'share') {
    return obs.value;
  }
  return (obs.value / worldPop) * 1000;
}

// ── STATUS command ─────────────────────────────────────────────────────────────

function cmdStatus(): void {
  const data = loadData();
  const obs = data.observations;

  let totalRelationship = 0;
  let totalAnchor = 0;
  const needsAnchor: string[] = [];
  const needsRelationship: string[] = [];

  for (const o of obs) {
    const rel = o.facts.filter(f => f.type === 'relationship').length;
    const anc = o.facts.filter(f => f.type === 'anchor').length;
    totalRelationship += rel;
    totalAnchor += anc;
    if (anc === 0) needsAnchor.push(o.id);
    if (rel === 0) needsRelationship.push(o.id);
  }

  console.log('\nPlanet1000 Fact Universe');
  console.log('─'.repeat(40));
  console.log(`Questions:      ${obs.length}`);
  console.log(`Relationship:   ${totalRelationship} facts`);
  console.log(`Anchor:         ${totalAnchor} facts`);
  console.log(`Total facts:    ${totalRelationship + totalAnchor}`);

  if (needsAnchor.length > 0) {
    console.log(`\nNeeds anchors (${needsAnchor.length}):`);
    for (const id of needsAnchor) {
      const o = obs.find(x => x.id === id)!;
      console.log(`  ${id}  (${o.entity.domain} — ${o.entity.name})`);
    }
  }

  if (needsRelationship.length > 0) {
    console.log(`\nNeeds relationship (${needsRelationship.length}):`);
    for (const id of needsRelationship) {
      const o = obs.find(x => x.id === id)!;
      console.log(`  ${id}  (${o.entity.domain} — ${o.entity.name})`);
    }
  }

  console.log('\nAll observations:');
  for (const o of obs) {
    const rel = o.facts.filter(f => f.type === 'relationship').length;
    const anc = o.facts.filter(f => f.type === 'anchor').length;
    const flag = anc === 0 ? ' ← needs anchor' : rel === 0 ? ' ← needs relationship' : '';
    console.log(`  ${o.id.padEnd(40)} R:${rel} A:${anc}${flag}`);
  }

  console.log('');
}

// ── HUNT command ───────────────────────────────────────────────────────────────

function cmdHunt(obsId: string): void {
  const data = loadData();
  const obs = data.observations.find(o => o.id === obsId);

  if (!obs) {
    console.error(`\nObservation not found: ${obsId}`);
    console.error('Run "status" to see valid IDs.');
    process.exit(1);
  }

  const relCount = obs.facts.filter(f => f.type === 'relationship').length;
  const ancCount = obs.facts.filter(f => f.type === 'anchor').length;
  const answer = per1k(obs, data.world_population);

  console.log(`\n── Fact Hunt: ${obs.entity.name} (${obs.id}) ──`);
  console.log(`Domain:   ${obs.entity.domain}`);
  console.log(`Metric:   ${obs.metric.name}`);
  console.log(`Answer:   ${answer.toFixed(1)} per 1,000 (DO NOT put this in any fact)`);
  console.log(`Facts:    ${relCount} relationship, ${ancCount} anchor`);
  console.log('');

  // Generate research prompts biased toward gaps
  const prompts: Array<{ type: 'relationship' | 'anchor'; prompt: string }> = [];

  if (ancCount < 2) {
    // Push anchor facts
    prompts.push({
      type: 'anchor',
      prompt: `Find the number of "${obs.entity.name.toLowerCase()}" in ONE specific country or region (not the world total). ` +
        `It should be small enough that a player can't divide by world population to get the answer. ` +
        `Include the source and year. Example format: "In [country], approximately [number] [unit]..."`,
    });
    prompts.push({
      type: 'anchor',
      prompt: `Find a sub-Saharan African country's figure for "${obs.entity.name.toLowerCase()}". ` +
        `A partial number that requires extrapolation — not calculable to the world total.`,
    });
  }

  if (relCount < 2) {
    // Push relationship facts
    prompts.push({
      type: 'relationship',
      prompt: `Find a ratio or comparison about "${obs.entity.name.toLowerCase()}" between two regions or income groups. ` +
        `No world totals. Example: "[Region A] has X times more than [Region B]" or "X% of [group] in [place]..."`,
    });
  }

  // Always add variety prompts
  prompts.push({
    type: 'relationship',
    prompt: `Find a historical trend for "${obs.entity.name.toLowerCase()}" — how has it changed over 20–50 years? ` +
      `What drove the change? Which regions improved most / least?`,
  });

  prompts.push({
    type: 'anchor',
    prompt: `Find a South Asian country's figure for "${obs.entity.name.toLowerCase()}" ` +
      `(India, Bangladesh, Pakistan, or Nepal) — a specific number for that country only.`,
  });

  prompts.push({
    type: 'relationship',
    prompt: `Find an inequality or gender gap related to "${obs.entity.name.toLowerCase()}". ` +
      `Who is disproportionately affected — women, children, rural populations, low-income groups?`,
  });

  console.log('Research prompts:');
  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i];
    console.log(`\n[${i + 1}] (${p.type.toUpperCase()})`);
    console.log(`    ${p.prompt}`);
  }

  console.log(`\nExisting facts for ${obsId}:`);
  if (obs.facts.length === 0) {
    console.log('  (none)');
  } else {
    for (const f of obs.facts) {
      console.log(`  [${f.type}] ${f.text}`);
    }
  }
  console.log('');
}

// ── ADD command (interactive) ──────────────────────────────────────────────────

async function cmdAdd(obsId: string): Promise<void> {
  const data = loadData();
  const obsIndex = data.observations.findIndex(o => o.id === obsId);

  if (obsIndex === -1) {
    console.error(`\nObservation not found: ${obsId}`);
    console.error('Run "status" to see valid IDs.');
    process.exit(1);
  }

  const obs = data.observations[obsIndex];
  const answer = per1k(obs, data.world_population);

  console.log(`\n── Add Fact: ${obs.entity.name} (${obs.id}) ──`);
  console.log(`Answer (per 1k): ${answer.toFixed(1)} — do NOT include this in the fact text.`);
  console.log('');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> =>
    new Promise(resolve => rl.question(q, answer => resolve(answer.trim())));

  // Choose type
  let factType: 'relationship' | 'anchor';
  while (true) {
    const t = await ask('Fact type? [r]elationship or [a]nchor: ');
    if (t.toLowerCase().startsWith('r')) { factType = 'relationship'; break; }
    if (t.toLowerCase().startsWith('a')) { factType = 'anchor'; break; }
    console.log('Please enter r or a.');
  }

  console.log('');
  if (factType === 'relationship') {
    console.log('Relationship fact rules:');
    console.log('  ✓ Compare regions, groups, income levels');
    console.log('  ✓ Historical trends, ratios, proportions');
    console.log('  ✗ NO world total that divides to the per-1k answer');
  } else {
    console.log('Anchor fact rules:');
    console.log('  ✓ ONE specific number for ONE country/region');
    console.log('  ✓ Must be strictly less than the global total');
    console.log('  ✗ NOT the world total or any figure calculable to it');
  }
  console.log('');

  const text = await ask('Fact text: ');
  if (!text) { console.log('Aborted — empty text.'); rl.close(); return; }

  const source = await ask('Source URL (optional): ');
  const year = await ask('Year (optional): ');

  // Show preview
  const newFact: Fact = { text, type: factType };
  console.log('\nPreview:');
  console.log(JSON.stringify(newFact, null, 2));
  if (source) console.log(`Source: ${source}${year ? ` (${year})` : ''}`);

  const confirm = await ask('\nAdd this fact? [y/N]: ');
  if (!confirm.toLowerCase().startsWith('y')) {
    console.log('Aborted.');
    rl.close();
    return;
  }

  data.observations[obsIndex].facts.push(newFact);
  saveData(data);

  const rel = data.observations[obsIndex].facts.filter(f => f.type === 'relationship').length;
  const anc = data.observations[obsIndex].facts.filter(f => f.type === 'anchor').length;
  console.log(`\n✓ Added. ${obs.id} now has ${rel} relationship + ${anc} anchor facts.`);

  rl.close();
}

// ── List observations helper ───────────────────────────────────────────────────

function listObservations(): void {
  const data = loadData();
  console.log('\nValid observation IDs:');
  for (const o of data.observations) {
    console.log(`  ${o.id.padEnd(40)} ${o.entity.domain} — ${o.entity.name}`);
  }
  console.log('');
}

// ── Entry point ────────────────────────────────────────────────────────────────

const [, , command, obsId] = process.argv;

switch (command) {
  case 'status':
    cmdStatus();
    break;

  case 'hunt':
    if (!obsId) {
      console.error('Usage: fact-hunt hunt [observation-id]');
      listObservations();
      process.exit(1);
    }
    cmdHunt(obsId);
    break;

  case 'add':
    if (!obsId) {
      console.error('Usage: fact-hunt add [observation-id]');
      listObservations();
      process.exit(1);
    }
    cmdAdd(obsId).catch(err => { console.error(err); process.exit(1); });
    break;

  default:
    console.log('\nfact-hunt — Planet1000 creator tool for growing the fact universe');
    console.log('');
    console.log('Commands:');
    console.log('  status                   Show fact counts for all observations');
    console.log('  hunt [observation-id]    Generate research prompts for an observation');
    console.log('  add  [observation-id]    Interactively add a new fact');
    console.log('');
    console.log('Example:');
    console.log('  npx tsx scripts/fact-hunt.ts status');
    console.log('  npx tsx scripts/fact-hunt.ts hunt housing-homeless');
    console.log('  npx tsx scripts/fact-hunt.ts add housing-homeless');
    console.log('');
    break;
}
