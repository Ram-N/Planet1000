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
 *   --type  / -t   r|a|t  (relationship, anchor, or temporal)
 *   --fact  / -f   fact text (alias: --text)
 *   --source / -s  source URL (optional)
 *   --year  / -y   year (optional)
 *   --csv   / -c   path to bulk CSV file (observation_id,type,text,source,year)
 *
 * Fact types:
 *   relationship  Hint 1 — comparative context (no world totals)
 *   temporal      Hint 2 — trend / change over time
 *   anchor        Hint 3 — concrete number for ONE region (best calibration before final guess)
 *
 * Source of truth:
 *   data/canonical-facts/  — facts per domain (people.csv, healthcare.csv, etc.)
 *   data/generated/world-model.json — regenerated from canonical-facts/ via `rebuild`
 *
 * This script reads and writes world-model.json directly.
 * It is a creator-only tool — not shipped to players.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ── Types ─────────────────────────────────────────────────────────────────────

type FactType = 'relationship' | 'anchor' | 'temporal';

interface Fact {
  text: string;
  type: FactType;
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
  type: FactType;
  text: string;
  source?: string;
  year?: string;
}

// ── Paths ─────────────────────────────────────────────────────────────────────

const DATA_PATH = path.join(__dirname, '../data/generated/world-model.json');
const CANONICAL_DIR = path.join(__dirname, '../data/canonical-facts');

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

// ── Type helpers ───────────────────────────────────────────────────────────────

function parseFactType(raw: string): FactType | null {
  const s = raw.toLowerCase();
  if (s === 'relationship' || s.startsWith('r')) return 'relationship';
  if (s === 'anchor'       || s.startsWith('a')) return 'anchor';
  if (s === 'temporal'     || s.startsWith('t')) return 'temporal';
  return null;
}

const TYPE_ABBR: Record<FactType, string> = {
  relationship: 'R',
  anchor:       'A',
  temporal:     'T',
};

// ── Canonical CSV helpers ──────────────────────────────────────────────────────

function appendToCanonical(rows: CanonicalRow[]): void {
  // Group rows by domain (derived from observation entity in world-model.json)
  const data = loadData();
  const obsToFile = new Map<string, string>();
  for (const obs of data.observations) {
    obsToFile.set(obs.id, path.join(CANONICAL_DIR, obs.entity.domain + '.csv'));
  }

  if (!fs.existsSync(CANONICAL_DIR)) {
    fs.mkdirSync(CANONICAL_DIR, { recursive: true });
  }

  // Group rows by target file
  const byFile = new Map<string, CanonicalRow[]>();
  for (const r of rows) {
    const filePath = obsToFile.get(r.observation_id);
    if (!filePath) continue;
    if (!byFile.has(filePath)) byFile.set(filePath, []);
    byFile.get(filePath)!.push(r);
  }

  for (const [filePath, fileRows] of byFile) {
    const needsHeader = !fs.existsSync(filePath);
    const lines: string[] = [];
    if (needsHeader) {
      lines.push('observation_id,type,text,source,year');
    }
    for (const r of fileRows) {
      const cols = [
        csvEscape(r.observation_id),
        csvEscape(r.type),
        csvEscape(r.text),
        csvEscape(r.source ?? ''),
        csvEscape(r.year ?? ''),
      ];
      lines.push(cols.join(','));
    }
    fs.appendFileSync(filePath, lines.join('\n') + '\n');
  }
}

// ── STATUS command ─────────────────────────────────────────────────────────────

function cmdStatus(): void {
  const data = loadData();
  const obs = data.observations;

  let totalRelationship = 0;
  let totalAnchor = 0;
  let totalTemporal = 0;
  const needsAnchor: string[] = [];
  const needsRelationship: string[] = [];
  const needsTemporal: string[] = [];

  for (const o of obs) {
    const rel = o.facts.filter(f => f.type === 'relationship').length;
    const anc = o.facts.filter(f => f.type === 'anchor').length;
    const tmp = o.facts.filter(f => f.type === 'temporal').length;
    totalRelationship += rel;
    totalAnchor += anc;
    totalTemporal += tmp;
    if (anc === 0) needsAnchor.push(o.id);
    if (rel === 0) needsRelationship.push(o.id);
    if (tmp === 0) needsTemporal.push(o.id);
  }

  console.log('\nPlanet1000 Fact Universe');
  console.log('─'.repeat(40));
  console.log(`Questions:      ${obs.length}`);
  console.log(`Relationship:   ${totalRelationship} facts  (Hint 1 — comparative context)`);
  console.log(`Temporal:       ${totalTemporal} facts  (Hint 2 — trend over time)`);
  console.log(`Anchor:         ${totalAnchor} facts  (Hint 3 — concrete scale number)`);
  console.log(`Total facts:    ${totalRelationship + totalAnchor + totalTemporal}`);

  if (needsRelationship.length > 0) {
    console.log(`\nNeeds relationship (${needsRelationship.length}):`);
    for (const id of needsRelationship) {
      const o = obs.find(x => x.id === id)!;
      console.log(`  ${id}  (${o.entity.domain} — ${o.entity.name})`);
    }
  }

  if (needsTemporal.length > 0) {
    console.log(`\nNeeds temporal (${needsTemporal.length}):`);
    for (const id of needsTemporal) {
      const o = obs.find(x => x.id === id)!;
      console.log(`  ${id}  (${o.entity.domain} — ${o.entity.name})`);
    }
  }

  if (needsAnchor.length > 0) {
    console.log(`\nNeeds anchor (${needsAnchor.length}):`);
    for (const id of needsAnchor) {
      const o = obs.find(x => x.id === id)!;
      console.log(`  ${id}  (${o.entity.domain} — ${o.entity.name})`);
    }
  }

  console.log('\nAll observations:');
  for (const o of obs) {
    const rel = o.facts.filter(f => f.type === 'relationship').length;
    const anc = o.facts.filter(f => f.type === 'anchor').length;
    const tmp = o.facts.filter(f => f.type === 'temporal').length;
    const missing = [
      rel === 0 ? 'needs-relationship' : '',
      tmp === 0 ? 'needs-temporal' : '',
      anc === 0 ? 'needs-anchor' : '',
    ].filter(Boolean).join(', ');
    const flag = missing ? ` ← ${missing}` : '';
    console.log(`  ${o.id.padEnd(40)} R:${rel} T:${tmp} A:${anc}${flag}`);
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
  const tmpCount = obs.facts.filter(f => f.type === 'temporal').length;
  const answer = per1k(obs, data.world_population);

  console.log(`\n── Fact Hunt: ${obs.entity.name} (${obs.id}) ──`);
  console.log(`Domain:   ${obs.entity.domain}`);
  console.log(`Metric:   ${obs.metric.name}`);
  console.log(`Answer:   ${answer.toFixed(1)} per 1,000 (DO NOT put this in any fact)`);
  console.log(`Facts:    ${relCount} relationship, ${tmpCount} temporal, ${ancCount} anchor`);
  console.log('');

  const prompts: Array<{ type: FactType; prompt: string }> = [];

  // ── Relationship prompts ─────────────────────────────────────────────────
  if (relCount < 2) {
    prompts.push({
      type: 'relationship',
      prompt: `Find a ratio or comparison about "${obs.entity.name.toLowerCase()}" between two regions or income groups. ` +
        `No world totals. Example: "[Region A] has X times more than [Region B]" or "X% of [group] in [place]..."`,
    });
  }

  prompts.push({
    type: 'relationship',
    prompt: `Find an inequality or gender gap related to "${obs.entity.name.toLowerCase()}". ` +
      `Who is disproportionately affected — women, children, rural populations, low-income groups?`,
  });

  // ── Temporal prompts ────────────────────────────────────────────────────
  if (tmpCount < 1) {
    prompts.push({
      type: 'temporal',
      prompt: `Find the historical trend for "${obs.entity.name.toLowerCase()}" — how has the figure changed over the past 20–50 years? ` +
        `Include approximate values at two time points (e.g. "In 2000, X; today, Y"). ` +
        `Mention the main driver of the change. Do NOT give the current world per-1k figure directly.`,
    });
  }

  prompts.push({
    type: 'temporal',
    prompt: `Find which region improved most (or declined most) for "${obs.entity.name.toLowerCase()}" over the past two decades. ` +
      `What drove that change? Describe the direction and rough magnitude without revealing the world total.`,
  });

  // ── Anchor prompts ──────────────────────────────────────────────────────
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

  prompts.push({
    type: 'anchor',
    prompt: `Find a South Asian country's figure for "${obs.entity.name.toLowerCase()}" ` +
      `(India, Bangladesh, Pakistan, or Nepal) — a specific number for that country only.`,
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
    const factType = parseFactType(flags.type);
    if (!factType) {
      console.error('--type must be r (relationship), a (anchor), or t (temporal).');
      rl.close();
      process.exit(1);
    }
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
    const tmp = data.observations[obsIndex].facts.filter(f => f.type === 'temporal').length;
    console.log(`\n✓ Added. ${obs.id} now has ${rel}R ${tmp}T ${anc}A facts.`);
    rl.close();
    return;
  }

  // ── Interactive mode ───────────────────────────────────────────────────────
  let factType: FactType;
  while (true) {
    const t = await ask('Fact type? [r]elationship, [t]emporal, or [a]nchor: ');
    const parsed = parseFactType(t);
    if (parsed) { factType = parsed; break; }
    console.log('Please enter r, t, or a.');
  }

  console.log('');
  if (factType === 'relationship') {
    console.log('Relationship fact rules (Hint 1 — comparative context):');
    console.log('  ✓ Compare regions, groups, income levels');
    console.log('  ✓ Ratios, proportions, inequalities');
    console.log('  ✗ NO world total that divides to the per-1k answer');
  } else if (factType === 'temporal') {
    console.log('Temporal fact rules (Hint 2 — trend over time):');
    console.log('  ✓ How the figure has changed over 20–50 years');
    console.log('  ✓ Approximate values at two time points');
    console.log('  ✓ Direction of change (rising, falling, stable)');
    console.log('  ✗ NOT a direct statement of today\'s world per-1k figure');
  } else {
    console.log('Anchor fact rules (Hint 3 — concrete scale number):');
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
  const tmp = data.observations[obsIndex].facts.filter(f => f.type === 'temporal').length;
  console.log(`\n✓ Added. ${obs.id} now has ${rel}R ${tmp}T ${anc}A facts.`);

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
    const rawType = r['type']?.trim().toLowerCase();
    const text = r['text']?.trim();

    if (!obsId || !validIds.has(obsId)) {
      console.warn(`  [skip row ${lineNum}] Unknown observation_id: "${obsId}"`);
      skipCount++;
      continue;
    }
    const factType = rawType ? parseFactType(rawType) : null;
    if (!factType) {
      console.warn(`  [skip row ${lineNum}] Invalid type: "${rawType}" (must be relationship, temporal, or anchor)`);
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
      type: factType,
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
    const tmp = obs.facts.filter(f => f.type === 'temporal').length;
    console.log(`  ${obsId}: +${rows.length} (now ${rel}R ${tmp}T ${anc}A)`);
  }
  console.log(`\n✓ Done. Added ${valid.length} facts.`);
}

// ── REBUILD command ────────────────────────────────────────────────────────────

function cmdRebuild(): void {
  if (!fs.existsSync(CANONICAL_DIR)) {
    console.error(`\ncanonical-facts/ directory not found at: ${CANONICAL_DIR}`);
    console.error('Nothing to rebuild from.');
    process.exit(1);
  }

  const data = loadData();
  const validIds = new Set(data.observations.map(o => o.id));

  const files = fs.readdirSync(CANONICAL_DIR).filter((f: string) => f.endsWith('.csv')).sort();
  const allRows: Record<string, string>[] = [];
  for (const file of files) {
    allRows.push(...parseCSV(path.join(CANONICAL_DIR, file)));
  }
  const rawRows = allRows;
  const valid: CanonicalRow[] = [];
  let skipCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const lineNum = i + 2;
    const obsId = r['observation_id']?.trim();
    const rawType = r['type']?.trim().toLowerCase();
    const text = r['text']?.trim();

    if (!obsId || !validIds.has(obsId)) {
      console.warn(`  [skip row ${lineNum}] Unknown observation_id: "${obsId}"`);
      skipCount++;
      continue;
    }
    const factType = rawType ? parseFactType(rawType) : null;
    if (!factType) {
      console.warn(`  [skip row ${lineNum}] Invalid type: "${rawType}"`);
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
      type: factType,
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
    console.log('  rebuild                       Regenerate world-model.json from canonical-facts/ folder');
    console.log('');
    console.log('Fact types (used as Hint 1 → 2 → 3 in the 4-guess game):');
    console.log('  r / relationship   Hint 1 — comparative context (no world totals)');
    console.log('  t / temporal       Hint 2 — trend / change over time');
    console.log('  a / anchor         Hint 3 — concrete number for ONE region (best calibration)');
    console.log('');
    console.log('One-shot add (skips prompts):');
    console.log('  add [id] --type r --fact "..." [--source "..."] [--year 2023]');
    console.log('  add [id]  -t     t  -f      "..."  [-s          "..."]  [-y    2023]');
    console.log('  add [id]  -t     a  -f      "..."  [-s          "..."]  [-y    2023]');
    console.log('');
    console.log('Bulk add CSV format (columns: observation_id,type,text,source,year):');
    console.log('  add --csv scripts/input/my-facts.csv');
    console.log('  add -c /tmp/batch.csv');
    console.log('');
    console.log('Source of truth:');
    console.log('  data/canonical-facts/ — facts per domain (people.csv, healthcare.csv, etc.); use rebuild to restore world-model.json');
    console.log('');
    console.log('Examples:');
    console.log('  npx tsx scripts/fact-hunt.ts status');
    console.log('  npx tsx scripts/fact-hunt.ts hunt people-children');
    console.log('  npx tsx scripts/fact-hunt.ts add people-children');
    console.log('  npx tsx scripts/fact-hunt.ts add people-children -t t -f "In 2000 it was X; today it is Y due to..."');
    console.log('  npx tsx scripts/fact-hunt.ts add people-children -t r -f "Sub-Saharan Africa has 3x more..." -s "https://..." -y 2021');
    console.log('  npx tsx scripts/fact-hunt.ts add people-children -t a -f "In Niger, approximately X..." -s "https://..."');
    console.log('  npx tsx scripts/fact-hunt.ts add --csv scripts/input/batch.csv');
    console.log('  npx tsx scripts/fact-hunt.ts rebuild');
    console.log('');
    break;
}
