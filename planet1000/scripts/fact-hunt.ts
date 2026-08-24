/**
 * fact-hunt — Creator tool for growing the Planet1000 fact universe.
 *
 * Usage:
 *   npx tsx scripts/fact-hunt.ts status
 *   npx tsx scripts/fact-hunt.ts hunt [observation-id]
 *   npx tsx scripts/fact-hunt.ts add [observation-id]
 *   npx tsx scripts/fact-hunt.ts add [observation-id] --type r --fact "..." [--source "..."] [--year 2023]
 *   npx tsx scripts/fact-hunt.ts add --csv <path/to/file.csv>
 *   npx tsx scripts/fact-hunt.ts rebuild
 *
 * Flags for non-interactive add:
 *   --type  / -t   r|a  (relationship or anchor)
 *   --fact  / -f   fact text (alias: --text)
 *   --source / -s  source URL (optional)
 *   --year  / -y   year (optional)
 *   --csv   / -c   path to bulk CSV file (observation_id,type,text,source,year)
 *
 * Source of truth:
 *   data/canonical-facts.csv  — all facts, durable record
 *   data/generated/world-model.json — regenerated from canonical-facts.csv via `rebuild`
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

interface CanonicalRow {
  observation_id: string;
  type: 'relationship' | 'anchor';
  text: string;
  source?: string;
  year?: string;
}

// ── Paths ─────────────────────────────────────────────────────────────────────

const DATA_PATH = path.join(__dirname, '../data/generated/world-model.json');
const CANONICAL_PATH = path.join(__dirname, '../data/canonical-facts.csv');

// ── Data helpers ───────────────────────────────────────────────────────────────

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

// ── CSV parser ─────────────────────────────────────────────────────────────────

function parseCSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim() !== '');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

// ── Canonical CSV helpers ──────────────────────────────────────────────────────

function appendToCanonical(rows: CanonicalRow[]): void {
  const needsHeader = !fs.existsSync(CANONICAL_PATH);
  const lines: string[] = [];

  if (needsHeader) {
    lines.push('observation_id,type,text,source,year');
  }

  for (const r of rows) {
    const cols = [
      csvEscape(r.observation_id),
      csvEscape(r.type),
      csvEscape(r.text),
      csvEscape(r.source ?? ''),
      csvEscape(r.year ?? ''),
    ];
    lines.push(cols.join(','));
  }

  fs.appendFileSync(CANONICAL_PATH, lines.join('\n') + '\n');
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

  const prompts: Array<{ type: 'relationship' | 'anchor'; prompt: string }> = [];

  if (ancCount < 2) {
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
    prompts.push({
      type: 'relationship',
      prompt: `Find a ratio or comparison about "${obs.entity.name.toLowerCase()}" between two regions or income groups. ` +
        `No world totals. Example: "[Region A] has X times more than [Region B]" or "X% of [group] in [place]..."`,
    });
  }

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

// ── Flag parser ────────────────────────────────────────────────────────────────

interface AddFlags {
  type?: string;
  text?: string;
  source?: string;
  year?: string;
  csv?: string;
}

function parseAddFlags(argv: string[]): AddFlags {
  const flags: AddFlags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if ((arg === '--type'   || arg === '-t') && next) { flags.type   = next; i++; }
    if ((arg === '--text'   || arg === '--fact' || arg === '-f') && next) { flags.text = next; i++; }
    if ((arg === '--source' || arg === '-s') && next) { flags.source = next; i++; }
    if ((arg === '--year'   || arg === '-y') && next) { flags.year   = next; i++; }
    if ((arg === '--csv'    || arg === '-c') && next) { flags.csv    = next; i++; }
  }
  return flags;
}

// ── ADD command (interactive or one-shot) ─────────────────────────────────────

async function cmdAdd(obsId: string, flags: AddFlags = {}): Promise<void> {
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

  // ── One-shot mode: all required flags provided ─────────────────────────────
  if (flags.type && flags.text) {
    const rawType = flags.type.toLowerCase();
    if (!rawType.startsWith('r') && !rawType.startsWith('a')) {
      console.error('--type must be r (relationship) or a (anchor).');
      rl.close();
      process.exit(1);
    }
    const factType: 'relationship' | 'anchor' = rawType.startsWith('r') ? 'relationship' : 'anchor';
    const newFact: Fact = { text: flags.text, type: factType };

    console.log('Preview:');
    console.log(JSON.stringify(newFact, null, 2));
    if (flags.source) console.log(`Source: ${flags.source}${flags.year ? ` (${flags.year})` : ''}`);

    const confirm = await ask('\nAdd this fact? [Y/n]: ');
    if (confirm.toLowerCase().startsWith('n')) {
      console.log('Aborted.');
      rl.close();
      return;
    }

    data.observations[obsIndex].facts.push(newFact);
    saveData(data);
    appendToCanonical([{ observation_id: obsId, type: factType, text: flags.text, source: flags.source, year: flags.year }]);

    const rel = data.observations[obsIndex].facts.filter(f => f.type === 'relationship').length;
    const anc = data.observations[obsIndex].facts.filter(f => f.type === 'anchor').length;
    console.log(`\n✓ Added. ${obs.id} now has ${rel} relationship + ${anc} anchor facts.`);
    rl.close();
    return;
  }

  // ── Interactive mode ───────────────────────────────────────────────────────
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
  appendToCanonical([{ observation_id: obsId, type: factType, text, source: source || undefined, year: year || undefined }]);

  const rel = data.observations[obsIndex].facts.filter(f => f.type === 'relationship').length;
  const anc = data.observations[obsIndex].facts.filter(f => f.type === 'anchor').length;
  console.log(`\n✓ Added. ${obs.id} now has ${rel} relationship + ${anc} anchor facts.`);

  rl.close();
}

// ── ADD BULK command (--csv) ───────────────────────────────────────────────────

async function cmdAddBulk(csvPath: string): Promise<void> {
  const resolvedPath = path.resolve(csvPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`\nFile not found: ${resolvedPath}`);
    process.exit(1);
  }

  const data = loadData();
  const validIds = new Set(data.observations.map(o => o.id));

  const rawRows = parseCSV(resolvedPath);
  const valid: CanonicalRow[] = [];
  let skipCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const lineNum = i + 2; // 1-based, +1 for header
    const obsId = r['observation_id']?.trim();
    const type = r['type']?.trim().toLowerCase();
    const text = r['text']?.trim();

    if (!obsId || !validIds.has(obsId)) {
      console.warn(`  [skip row ${lineNum}] Unknown observation_id: "${obsId}"`);
      skipCount++;
      continue;
    }
    if (type !== 'relationship' && type !== 'anchor') {
      console.warn(`  [skip row ${lineNum}] Invalid type: "${type}" (must be relationship or anchor)`);
      skipCount++;
      continue;
    }
    if (!text) {
      console.warn(`  [skip row ${lineNum}] Empty text`);
      skipCount++;
      continue;
    }

    valid.push({
      observation_id: obsId,
      type: type as 'relationship' | 'anchor',
      text,
      source: r['source']?.trim() || undefined,
      year: r['year']?.trim() || undefined,
    });
  }

  if (valid.length === 0) {
    console.log('\nNo valid rows to add.');
    return;
  }

  // Group by observation_id for preview
  const grouped = new Map<string, CanonicalRow[]>();
  for (const r of valid) {
    if (!grouped.has(r.observation_id)) grouped.set(r.observation_id, []);
    grouped.get(r.observation_id)!.push(r);
  }

  console.log('\nPreview:');
  for (const [obsId, rows] of grouped) {
    console.log(`  ${obsId}:`);
    for (const r of rows) {
      const src = r.source ? ` [${r.source}]` : '';
      const yr = r.year ? ` (${r.year})` : '';
      console.log(`    [${r.type}] ${r.text}${src}${yr}`);
    }
  }

  const skippedMsg = skipCount > 0 ? ` ${skipCount} row${skipCount === 1 ? '' : 's'} skipped (see above).` : '';
  console.log(`\n${valid.length} fact${valid.length === 1 ? '' : 's'} across ${grouped.size} observation${grouped.size === 1 ? '' : 's'} ready to add.${skippedMsg}`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const confirm = await new Promise<string>(resolve => rl.question('Add all? [Y/n]: ', a => resolve(a.trim())));
  rl.close();

  if (confirm.toLowerCase().startsWith('n')) {
    console.log('Aborted.');
    return;
  }

  // Apply to world-model.json
  for (const r of valid) {
    const obsIndex = data.observations.findIndex(o => o.id === r.observation_id);
    if (obsIndex === -1) continue;
    data.observations[obsIndex].facts.push({ text: r.text, type: r.type });
  }
  saveData(data);

  // Append to canonical
  appendToCanonical(valid);

  // Per-observation summary
  console.log('');
  for (const [obsId, rows] of grouped) {
    const obs = data.observations.find(o => o.id === obsId)!;
    const rel = obs.facts.filter(f => f.type === 'relationship').length;
    const anc = obs.facts.filter(f => f.type === 'anchor').length;
    console.log(`  ${obsId}: +${rows.length} (now ${rel}R ${anc}A)`);
  }
  console.log(`\n✓ Done. Added ${valid.length} facts.`);
}

// ── REBUILD command ────────────────────────────────────────────────────────────

function cmdRebuild(): void {
  if (!fs.existsSync(CANONICAL_PATH)) {
    console.error(`\ncanonical-facts.csv not found at: ${CANONICAL_PATH}`);
    console.error('Nothing to rebuild from.');
    process.exit(1);
  }

  const data = loadData();
  const validIds = new Set(data.observations.map(o => o.id));

  const rawRows = parseCSV(CANONICAL_PATH);
  const valid: CanonicalRow[] = [];
  let skipCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const lineNum = i + 2;
    const obsId = r['observation_id']?.trim();
    const type = r['type']?.trim().toLowerCase();
    const text = r['text']?.trim();

    if (!obsId || !validIds.has(obsId)) {
      console.warn(`  [skip row ${lineNum}] Unknown observation_id: "${obsId}"`);
      skipCount++;
      continue;
    }
    if (type !== 'relationship' && type !== 'anchor') {
      console.warn(`  [skip row ${lineNum}] Invalid type: "${type}"`);
      skipCount++;
      continue;
    }
    if (!text) {
      console.warn(`  [skip row ${lineNum}] Empty text`);
      skipCount++;
      continue;
    }

    valid.push({
      observation_id: obsId,
      type: type as 'relationship' | 'anchor',
      text,
      source: r['source']?.trim() || undefined,
      year: r['year']?.trim() || undefined,
    });
  }

  // Clear all facts
  for (const obs of data.observations) {
    obs.facts = [];
  }

  // Repopulate
  for (const r of valid) {
    const obsIndex = data.observations.findIndex(o => o.id === r.observation_id);
    if (obsIndex === -1) continue;
    data.observations[obsIndex].facts.push({ text: r.text, type: r.type });
  }

  saveData(data);

  // Count per observation
  const countMap = new Map<string, number>();
  for (const r of valid) {
    countMap.set(r.observation_id, (countMap.get(r.observation_id) ?? 0) + 1);
  }

  const obsRestored = countMap.size;
  if (skipCount > 0) {
    console.log(`\n${skipCount} row${skipCount === 1 ? '' : 's'} skipped (see above).`);
  }
  console.log(`\nRebuilt facts for ${obsRestored} observation${obsRestored === 1 ? '' : 's'}. ${valid.length} fact${valid.length === 1 ? '' : 's'} restored.`);
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

const [, , command, ...cmdArgs] = process.argv;

// For 'add', the first positional arg may be an obsId or a flag
// Parse flags first to detect --csv mode
const addFlags = command === 'add' ? parseAddFlags(cmdArgs) : {};
const obsId = command === 'add' && cmdArgs[0] && !cmdArgs[0].startsWith('-') ? cmdArgs[0] : undefined;
const addRest = obsId ? cmdArgs.slice(1) : cmdArgs;
const addFlagsFinal = command === 'add' ? parseAddFlags(addRest) : addFlags;

switch (command) {
  case 'status':
    cmdStatus();
    break;

  case 'hunt': {
    const huntId = cmdArgs[0];
    if (!huntId) {
      console.error('Usage: fact-hunt hunt [observation-id]');
      listObservations();
      process.exit(1);
    }
    cmdHunt(huntId);
    break;
  }

  case 'add':
    if (addFlagsFinal.csv) {
      cmdAddBulk(addFlagsFinal.csv).catch(err => { console.error(err); process.exit(1); });
    } else if (!obsId) {
      console.error('Usage: fact-hunt add [observation-id]');
      console.error('       fact-hunt add --csv <path/to/file.csv>');
      listObservations();
      process.exit(1);
    } else {
      cmdAdd(obsId, addFlagsFinal).catch(err => { console.error(err); process.exit(1); });
    }
    break;

  case 'rebuild':
    cmdRebuild();
    break;

  default:
    console.log('\nfact-hunt — Planet1000 creator tool for growing the fact universe');
    console.log('');
    console.log('Commands:');
    console.log('  status                        Show fact counts for all observations');
    console.log('  hunt [observation-id]         Generate research prompts for an observation');
    console.log('  add  [observation-id]         Interactively add a new fact');
    console.log('  add  --csv <path>             Bulk-add facts from a CSV file');
    console.log('  rebuild                       Regenerate world-model.json from canonical-facts.csv');
    console.log('');
    console.log('One-shot add (skips prompts):');
    console.log('  add [id] --type r --fact "..." [--source "..."] [--year 2023]');
    console.log('  add [id]  -t     a  -f      "..."  [-s          "..."]  [-y    2023]');
    console.log('');
    console.log('Bulk add CSV format (columns: observation_id,type,text,source,year):');
    console.log('  add --csv scripts/input/my-facts.csv');
    console.log('  add -c /tmp/batch.csv');
    console.log('');
    console.log('Source of truth:');
    console.log('  data/canonical-facts.csv — all facts, durable; use rebuild to restore world-model.json');
    console.log('');
    console.log('Examples:');
    console.log('  npx tsx scripts/fact-hunt.ts status');
    console.log('  npx tsx scripts/fact-hunt.ts hunt people-children');
    console.log('  npx tsx scripts/fact-hunt.ts add people-children');
    console.log('  npx tsx scripts/fact-hunt.ts add people-children -t r -f "Sub-Saharan Africa has 3x more..." -s "https://..." -y 2021');
    console.log('  npx tsx scripts/fact-hunt.ts add --csv scripts/input/batch.csv');
    console.log('  npx tsx scripts/fact-hunt.ts rebuild');
    console.log('');
    break;
}
