/**
 * puzzle — Creator tool for managing Planet1000 weekly puzzles.
 *
 * Commands:
 *   npx tsx scripts/puzzle.ts status
 *   npx tsx scripts/puzzle.ts show <puzzle-id>
 *   npx tsx scripts/puzzle.ts show next <n>
 *   npx tsx scripts/puzzle.ts new <week-id>
 *
 * status
 *   Lists all puzzle manifests with week, publish date, domain, and question preview.
 *   Reads resolved answers from data/generated/puzzles/ when available.
 *
 * show <puzzle-id>
 *   Pretty-prints the resolved full puzzle (from data/generated/puzzles/).
 *   If the generated file doesn't exist, prompts you to run build:puzzles.
 *
 * new <week-id>
 *   Scaffolds a new slim puzzle manifest for the given ISO week (e.g. 2026-W36).
 *   Prompts for domain, observation_id, and question; lists available observations.
 *   Writes the manifest to data/puzzles/.
 *   Run npm run build:puzzles after to generate the full puzzle JSON.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ── Paths ─────────────────────────────────────────────────────────────────────

const ROOT           = path.join(__dirname, '..');
const PUZZLES_DIR    = path.join(ROOT, 'data', 'puzzles');
const GENERATED_DIR  = path.join(ROOT, 'data', 'generated', 'puzzles');
const ARTIFACTS_DIR  = path.join(ROOT, 'data', 'artifacts');
const WORLD_MODEL    = path.join(ROOT, 'data', 'generated', 'world-model.json');

// ── Types ─────────────────────────────────────────────────────────────────────

interface PuzzleSource {
  id: string;
  week_id: string;
  publish_date: string;
  domain: string;
  question: string;
  observation_id: string;
  answer_explanation: string;
  artifact_id: string;
}

interface PuzzleFact {
  text: string;
  source_label?: string;
  source_url?: string;
}

interface WeeklyPuzzle {
  id: string;
  week_id: string;
  publish_date: string;
  domain: string;
  question: string;
  answer_value_1k: number;
  answer_unit: string;
  answer_explanation: string;
  relationship_fact: PuzzleFact;
  temporal_fact: PuzzleFact;
  anchor_fact: PuzzleFact;
  artifact_id: string;
}

interface WorldObservation {
  id: string;
  entity?: { name: string };
  entity_id?: string;
  domain?: string;
}

// ── File helpers ──────────────────────────────────────────────────────────────

function listManifestFiles(): string[] {
  if (!fs.existsSync(PUZZLES_DIR)) return [];
  return fs.readdirSync(PUZZLES_DIR).filter(f => f.endsWith('.json')).sort();
}

function loadManifest(idOrFile: string): { source: PuzzleSource | null; error?: string } {
  const file = idOrFile.endsWith('.json') ? idOrFile : `${idOrFile}.json`;
  const filePath = path.join(PUZZLES_DIR, file);
  if (!fs.existsSync(filePath)) {
    return { source: null, error: `File not found: ${filePath}` };
  }
  try {
    return { source: JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PuzzleSource };
  } catch (e) {
    return { source: null, error: `JSON parse error: ${(e as Error).message}` };
  }
}

function loadGenerated(id: string): WeeklyPuzzle | null {
  const filePath = path.join(GENERATED_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as WeeklyPuzzle;
  } catch {
    return null;
  }
}

function artifactExists(id: string): boolean {
  return fs.existsSync(path.join(ARTIFACTS_DIR, `${id}.json`));
}

function loadObservations(): WorldObservation[] {
  if (!fs.existsSync(WORLD_MODEL)) return [];
  try {
    const wm = JSON.parse(fs.readFileSync(WORLD_MODEL, 'utf-8')) as { observations: WorldObservation[] };
    return wm.observations ?? [];
  } catch {
    return [];
  }
}

// ── ISO week helpers ──────────────────────────────────────────────────────────

function getCurrentISOWeek(): { year: number; week: number } {
  const d = new Date();
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayOfWeek = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: utc.getUTCFullYear(), week };
}

function getMondayOfISOWeek(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1));
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return monday;
}

function parseWeekId(weekId: string): { year: number; week: number } | null {
  const m = weekId.match(/^(\d{4})-W(\d{1,2})$/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const week = parseInt(m[2], 10);
  if (week < 1 || week > 53) return null;
  return { year, week };
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function puzzleIdFromWeek(year: number, week: number): string {
  return `puzzle_${year}_w${String(week).padStart(2, '0')}`;
}

// ── STATUS command ────────────────────────────────────────────────────────────

function cmdStatus(): void {
  const files = listManifestFiles();

  console.log('\nPlanet1000 Weekly Puzzles');
  console.log('─'.repeat(70));
  console.log(`${files.length} puzzle${files.length === 1 ? '' : 's'} on file\n`);

  if (files.length === 0) {
    console.log('  (none — create one with: puzzle new <week-id>)');
    console.log('');
    return;
  }

  for (const file of files) {
    const { source, error } = loadManifest(file);
    if (error || !source) {
      console.log(`  ✗ ${file}  — ${error}`);
      continue;
    }

    const generated = loadGenerated(source.id);
    const artifactOk = artifactExists(source.artifact_id);
    const artifactMark = artifactOk ? `→ ${source.artifact_id}` : `→ ${source.artifact_id}  ✗ MISSING`;
    const question = source.question.length > 60
      ? source.question.slice(0, 57) + '…'
      : source.question;

    console.log(`  ${source.week_id}  ${source.publish_date}  [${source.domain}]  obs: ${source.observation_id}`);
    console.log(`    Q: ${question}`);

    if (generated) {
      console.log(`    A: ${generated.answer_value_1k} ${generated.answer_unit}  ${artifactMark}`);
    } else {
      console.log(`    A: (not built — run: npm run build:puzzles)  ${artifactMark}`);
    }
    console.log('');
  }
}

// ── SHOW command ──────────────────────────────────────────────────────────────

function cmdShowNext(count: number): void {
  const { year, week } = getCurrentISOWeek();
  console.log(`\nNext ${count} puzzle${count === 1 ? '' : 's'} from current week (${year}-W${String(week).padStart(2, '0')}):\n`);

  for (let i = 1; i <= count; i++) {
    let w = week + i;
    let y = year;
    if (w > 52) { w -= 52; y++; }
    const id = puzzleIdFromWeek(y, w);
    const { source } = loadManifest(id);
    if (!source) {
      const monday = getMondayOfISOWeek(y, w);
      console.log(`── ${y}-W${String(w).padStart(2, '0')}  ${formatDate(monday)}  [${id}]`);
      console.log(`   ✗ Not created yet — run: npm run puzzle -- new ${y}-W${String(w).padStart(2, '0')}`);
      console.log('');
    } else {
      printPuzzle(source);
    }
  }
}

function cmdShow(id: string, rest: string[] = []): void {
  if (!id) {
    console.error('\nUsage: puzzle show <puzzle-id>');
    console.error('       puzzle show next <n>');
    console.error('  Examples: puzzle show puzzle_2026_w35');
    console.error('            puzzle show next 3');
    process.exit(1);
  }

  if (id === 'next') {
    const n = parseInt(rest[0] ?? '1', 10);
    if (!isFinite(n) || n < 1) {
      console.error('\n✗ "puzzle show next <n>" requires a positive number');
      process.exit(1);
    }
    cmdShowNext(n);
    return;
  }

  const { source, error } = loadManifest(id);
  if (error || !source) {
    console.error(`\n✗ ${error}`);
    console.error('\nAvailable puzzles:');
    listManifestFiles().forEach(f => console.error(`  ${f.replace(/\.json$/, '')}`));
    process.exit(1);
  }

  printPuzzle(source);
}

function printPuzzle(source: PuzzleSource): void {
  const generated  = loadGenerated(source.id);
  const artifactOk = artifactExists(source.artifact_id);

  console.log('');
  console.log(`── ${source.id} ─────────────────────────────────────────`);
  console.log(`Week:       ${source.week_id}   (publishes ${source.publish_date})`);
  console.log(`Domain:     ${source.domain}`);
  console.log(`Observation: ${source.observation_id}`);
  console.log('');
  console.log(`QUESTION`);
  console.log(`  ${source.question}`);
  console.log('');

  if (generated) {
    console.log(`ANSWER`);
    console.log(`  ${generated.answer_value_1k} ${generated.answer_unit} out of 1,000`);
    console.log(`  ${generated.answer_explanation}`);
    console.log('');
    console.log(`HINT 1 — Relationship`);
    console.log(`  ${generated.relationship_fact.text}`);
    if (generated.relationship_fact.source_label) {
      const url = generated.relationship_fact.source_url ? `  <${generated.relationship_fact.source_url}>` : '';
      console.log(`  Source: ${generated.relationship_fact.source_label}${url}`);
    }
    console.log('');
    console.log(`HINT 2 — Temporal`);
    console.log(`  ${generated.temporal_fact.text}`);
    if (generated.temporal_fact.source_label) {
      const url = generated.temporal_fact.source_url ? `  <${generated.temporal_fact.source_url}>` : '';
      console.log(`  Source: ${generated.temporal_fact.source_label}${url}`);
    }
    console.log('');
    console.log(`HINT 3 — Anchor`);
    console.log(`  ${generated.anchor_fact.text}`);
    if (generated.anchor_fact.source_label) {
      const url = generated.anchor_fact.source_url ? `  <${generated.anchor_fact.source_url}>` : '';
      console.log(`  Source: ${generated.anchor_fact.source_label}${url}`);
    }
    console.log('');
  } else {
    console.log(`  (not built — run: npm run build:puzzles)`);
    console.log('');
  }

  console.log(`ARTIFACT`);
  console.log(`  ${source.artifact_id}  ${artifactOk ? '✓' : '✗ NOT FOUND'}`);
  console.log('');
}

// ── NEW command ───────────────────────────────────────────────────────────────

async function cmdNew(weekId: string): Promise<void> {
  if (!weekId) {
    console.error('\nUsage: puzzle new <week-id>');
    console.error('  Example: puzzle new 2026-W36');
    process.exit(1);
  }

  const parsed = parseWeekId(weekId);
  if (!parsed) {
    console.error(`\n✗ Invalid week-id "${weekId}". Use format: YYYY-WNN (e.g. 2026-W36)`);
    process.exit(1);
  }

  const { year, week } = parsed;
  const normalised  = `${year}-W${String(week).padStart(2, '0')}`;
  const puzzleId    = puzzleIdFromWeek(year, week);
  const monday      = getMondayOfISOWeek(year, week);
  const publishDate = formatDate(monday);
  const outPath     = path.join(PUZZLES_DIR, `${puzzleId}.json`);

  if (fs.existsSync(outPath)) {
    console.error(`\n✗ Puzzle already exists: ${outPath}`);
    console.error(`  Use: puzzle show ${puzzleId}`);
    process.exit(1);
  }

  // Load observations from world model so user can pick one
  const observations = loadObservations();

  const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> =>
    new Promise(resolve => rl.question(q, a => resolve(a.trim())));

  console.log(`\n── New Puzzle: ${puzzleId} ──`);
  console.log(`Week:    ${normalised}`);
  console.log(`Publish: ${publishDate} (Monday)\n`);

  // Show available observations grouped by domain
  if (observations.length > 0) {
    console.log('Available observations (from world-model.json):');
    const byDomain = new Map<string, WorldObservation[]>();
    for (const obs of observations) {
      const d = obs.domain ?? obs.entity?.name ?? 'other';
      if (!byDomain.has(d)) byDomain.set(d, []);
      byDomain.get(d)!.push(obs);
    }
    for (const [domain, obs] of byDomain) {
      console.log(`  [${domain}]`);
      for (const o of obs) {
        const name = o.entity?.name ?? o.entity_id ?? o.id;
        console.log(`    ${o.id}  (${name})`);
      }
    }
    console.log('');
  }

  const domainOpts  = 'people/healthcare/education/food/water/energy/housing/transportation/money/environment';
  const domain         = await ask(`Domain [${domainOpts}]: `);
  const observationId  = await ask('observation_id (from list above): ');
  const question       = await ask('Question (the "out of 1,000" prompt): ');

  // Suggest artifact id from domain
  const domainSlug       = domain.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const suggestedArtifact = `artifact_${domainSlug}_<topic>`;

  rl.close();

  if (!fs.existsSync(PUZZLES_DIR)) fs.mkdirSync(PUZZLES_DIR, { recursive: true });

  // Validate observation_id
  if (observations.length > 0 && !observations.find(o => o.id === observationId)) {
    console.warn(`\n⚠ observation_id "${observationId}" not found in world-model.json`);
    console.warn('  Check the ID above or run: npm run build:data to refresh the world model.');
  }

  const manifest: PuzzleSource = {
    id:                 puzzleId,
    week_id:            normalised,
    publish_date:       publishDate,
    domain:             domain || '<domain>',
    question:           question || '<question>',
    observation_id:     observationId || '<observation_id>',
    answer_explanation: '',
    artifact_id:        suggestedArtifact,
  };

  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`\n✓ Created: ${outPath}`);
  console.log('\nNext steps:');
  console.log(`  1. Fill in answer_explanation in the manifest`);
  console.log(`  2. Author facts in canonical-facts.csv for "${observationId || '<observation_id>'}":`);
  console.log(`       relationship, temporal, anchor  (one row each, minimum)`);
  console.log(`     Verify: npm run fact-hunt -- status`);
  console.log(`  3. Build the full puzzle JSON:`);
  console.log(`       npm run build:puzzles`);
  console.log(`  4. Preview: npm run puzzle -- show ${puzzleId}`);
  console.log(`  5. Create the artifact:  npm run artifact -- new ${suggestedArtifact.replace('_<topic>', '_<topic>')}`);
  console.log(`  6. Set artifact_id to match the artifact you create`);
  console.log(`  7. Register both in lib/puzzle-loader.ts`);
  console.log(`  8. Rebuild: npm run build:puzzles\n`);
}

// ── Entry point ───────────────────────────────────────────────────────────────

const [, , command, ...cmdArgs] = process.argv;

switch (command) {
  case 'status':
    cmdStatus();
    break;

  case 'show':
    cmdShow(cmdArgs[0], cmdArgs.slice(1));
    break;

  case 'new':
    cmdNew(cmdArgs[0]).catch(err => { console.error(err); process.exit(1); });
    break;

  default:
    console.log(`
puzzle — Planet1000 weekly puzzle manager

Commands:
  status              List all puzzle manifests with observation and build status
  show <id>           Print full resolved puzzle (from generated files)
  new <week-id>       Scaffold a new slim puzzle manifest for the given ISO week

Examples:
  npx tsx scripts/puzzle.ts status
  npx tsx scripts/puzzle.ts show puzzle_2026_w35
  npx tsx scripts/puzzle.ts new 2026-W36
  npx tsx scripts/puzzle.ts new 2026-W37

Week ID format: YYYY-WNN  (e.g. 2026-W36)
Manifest files:  data/puzzles/<puzzle_id>.json       (slim — edit this)
Generated files: data/generated/puzzles/<id>.json   (full — built by build:puzzles)

Workflow:
  1. puzzle new <week-id>            — create manifest
  2. Fill answer_explanation + author facts in canonical-facts.csv
  3. npm run build:puzzles           — generate full puzzle JSON
  4. puzzle show <id>                — verify resolved facts and answer
  5. Register in lib/puzzle-loader.ts
`);
    break;
}
