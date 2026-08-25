/**
 * puzzle — Creator tool for managing Planet1000 weekly puzzles.
 *
 * Commands:
 *   npx tsx scripts/puzzle.ts status
 *   npx tsx scripts/puzzle.ts show <puzzle-id>
 *   npx tsx scripts/puzzle.ts new <week-id>
 *
 * status
 *   Lists all puzzles with week, publish date, domain, and question preview.
 *   Flags missing artifact links.
 *
 * show <puzzle-id>
 *   Pretty-prints the full content of one puzzle: question, all three facts,
 *   answer, and artifact link.
 *
 * new <week-id>
 *   Scaffolds a new puzzle JSON for the given ISO week (e.g. 2026-W36).
 *   Prompts for domain and question; writes the skeleton to data/puzzles/.
 *   Also prints the week's Monday date and suggests the artifact_id.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ── Paths ─────────────────────────────────────────────────────────────────────

const ROOT          = path.join(__dirname, '..');
const PUZZLES_DIR   = path.join(ROOT, 'data', 'puzzles');
const ARTIFACTS_DIR = path.join(ROOT, 'data', 'artifacts');

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── File helpers ──────────────────────────────────────────────────────────────

function listPuzzleFiles(): string[] {
  if (!fs.existsSync(PUZZLES_DIR)) return [];
  return fs.readdirSync(PUZZLES_DIR).filter(f => f.endsWith('.json')).sort();
}

function loadPuzzle(idOrFile: string): { puzzle: WeeklyPuzzle | null; error?: string } {
  const file = idOrFile.endsWith('.json') ? idOrFile : `${idOrFile}.json`;
  const filePath = path.join(PUZZLES_DIR, file);
  if (!fs.existsSync(filePath)) {
    return { puzzle: null, error: `File not found: ${filePath}` };
  }
  try {
    return { puzzle: JSON.parse(fs.readFileSync(filePath, 'utf-8')) as WeeklyPuzzle };
  } catch (e) {
    return { puzzle: null, error: `JSON parse error: ${(e as Error).message}` };
  }
}

function artifactExists(id: string): boolean {
  return fs.existsSync(path.join(ARTIFACTS_DIR, `${id}.json`));
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
  const files = listPuzzleFiles();

  console.log('\nPlanet1000 Weekly Puzzles');
  console.log('─'.repeat(70));
  console.log(`${files.length} puzzle${files.length === 1 ? '' : 's'} on file\n`);

  if (files.length === 0) {
    console.log('  (none — create one with: puzzle new <week-id>)');
    console.log('');
    return;
  }

  for (const file of files) {
    const { puzzle, error } = loadPuzzle(file);
    if (error || !puzzle) {
      console.log(`  ✗ ${file}  — ${error}`);
      continue;
    }

    const artifactOk = artifactExists(puzzle.artifact_id);
    const artifactMark = artifactOk ? `→ ${puzzle.artifact_id}` : `→ ${puzzle.artifact_id}  ✗ MISSING`;
    const question = puzzle.question.length > 60
      ? puzzle.question.slice(0, 57) + '…'
      : puzzle.question;

    console.log(`  ${puzzle.week_id}  ${puzzle.publish_date}  [${puzzle.domain}]`);
    console.log(`    Q: ${question}`);
    console.log(`    A: ${puzzle.answer_value_1k} ${puzzle.answer_unit}  ${artifactMark}`);
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
    const { puzzle, error } = loadPuzzle(id);
    if (error || !puzzle) {
      const monday = getMondayOfISOWeek(y, w);
      console.log(`── ${y}-W${String(w).padStart(2, '0')}  ${formatDate(monday)}  [${id}]`);
      console.log(`   ✗ Not created yet — run: npm run puzzle -- new ${y}-W${String(w).padStart(2, '0')}`);
      console.log('');
    } else {
      printPuzzle(puzzle);
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

  // Handle "show next N"
  if (id === 'next') {
    const n = parseInt(rest[0] ?? '1', 10);
    if (!isFinite(n) || n < 1) {
      console.error('\n✗ "puzzle show next <n>" requires a positive number');
      process.exit(1);
    }
    cmdShowNext(n);
    return;
  }

  const { puzzle, error } = loadPuzzle(id);
  if (error || !puzzle) {
    console.error(`\n✗ ${error}`);
    console.error('\nAvailable puzzles:');
    listPuzzleFiles().forEach(f => console.error(`  ${f.replace(/\.json$/, '')}`));
    process.exit(1);
  }

  printPuzzle(puzzle);
}

function printPuzzle(puzzle: WeeklyPuzzle): void {
  const artifactOk = artifactExists(puzzle.artifact_id);

  console.log('');
  console.log(`── ${puzzle.id} ─────────────────────────────────────────`);
  console.log(`Week:       ${puzzle.week_id}   (publishes ${puzzle.publish_date})`);
  console.log(`Domain:     ${puzzle.domain}`);
  console.log('');
  console.log(`QUESTION`);
  console.log(`  ${puzzle.question}`);
  console.log('');
  console.log(`ANSWER`);
  console.log(`  ${puzzle.answer_value_1k} ${puzzle.answer_unit} out of 1,000`);
  console.log(`  ${puzzle.answer_explanation}`);
  console.log('');
  console.log(`HINT 1 — Relationship`);
  console.log(`  ${puzzle.relationship_fact.text}`);
  if (puzzle.relationship_fact.source_label) {
    const url = puzzle.relationship_fact.source_url ? `  <${puzzle.relationship_fact.source_url}>` : '';
    console.log(`  Source: ${puzzle.relationship_fact.source_label}${url}`);
  }
  console.log('');
  console.log(`HINT 2 — Temporal`);
  console.log(`  ${puzzle.temporal_fact.text}`);
  if (puzzle.temporal_fact.source_label) {
    const url = puzzle.temporal_fact.source_url ? `  <${puzzle.temporal_fact.source_url}>` : '';
    console.log(`  Source: ${puzzle.temporal_fact.source_label}${url}`);
  }
  console.log('');
  console.log(`HINT 3 — Anchor`);
  console.log(`  ${puzzle.anchor_fact.text}`);
  if (puzzle.anchor_fact.source_label) {
    const url = puzzle.anchor_fact.source_url ? `  <${puzzle.anchor_fact.source_url}>` : '';
    console.log(`  Source: ${puzzle.anchor_fact.source_label}${url}`);
  }
  console.log('');
  console.log(`ARTIFACT`);
  console.log(`  ${puzzle.artifact_id}  ${artifactOk ? '✓' : '✗ NOT FOUND'}`);
  console.log('');
}

// ── NEW command ───────────────────────────────────────────────────────────────

const SKELETON_FACT: PuzzleFact = {
  text: '',
  source_label: '',
  source_url: '',
};

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
  const normalised = `${year}-W${String(week).padStart(2, '0')}`;
  const puzzleId   = puzzleIdFromWeek(year, week);
  const monday     = getMondayOfISOWeek(year, week);
  const publishDate = formatDate(monday);
  const outPath    = path.join(PUZZLES_DIR, `${puzzleId}.json`);

  if (fs.existsSync(outPath)) {
    console.error(`\n✗ Puzzle already exists: ${outPath}`);
    console.error(`  Use: puzzle show ${puzzleId}`);
    process.exit(1);
  }

  const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> =>
    new Promise(resolve => rl.question(q, a => resolve(a.trim())));

  console.log(`\n── New Puzzle: ${puzzleId} ──`);
  console.log(`Week:    ${normalised}`);
  console.log(`Publish: ${publishDate} (Monday)\n`);

  const domainOpts = 'people/healthcare/education/food/water/energy/housing/transportation/money/environment';
  const domain   = await ask(`Domain [${domainOpts}]: `);
  const question = await ask('Question (the "out of 1,000" prompt): ');

  // Suggest artifact id from domain
  const domainSlug = domain.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const suggestedArtifact = `artifact_${domainSlug}_<topic>`;

  rl.close();

  if (!fs.existsSync(PUZZLES_DIR)) fs.mkdirSync(PUZZLES_DIR, { recursive: true });

  const skeleton: WeeklyPuzzle = {
    id:              puzzleId,
    week_id:         normalised,
    publish_date:    publishDate,
    domain:          domain || '<domain>',
    question:        question || '<question>',
    answer_value_1k: 0,
    answer_unit:     'people',
    answer_explanation: '',
    relationship_fact: { ...SKELETON_FACT },
    temporal_fact:     { ...SKELETON_FACT },
    anchor_fact:       { ...SKELETON_FACT },
    artifact_id:     suggestedArtifact,
  };

  fs.writeFileSync(outPath, JSON.stringify(skeleton, null, 2) + '\n');

  console.log(`\n✓ Created: ${outPath}`);
  console.log('\nNext steps:');
  console.log(`  1. Fill in answer_value_1k, answer_unit, answer_explanation`);
  console.log(`  2. Write the three facts (relationship, temporal, anchor)`);
  console.log(`  3. Create the artifact:  npm run artifact -- new ${suggestedArtifact.replace('_<topic>', '_<topic>')}`);
  console.log(`  4. Set artifact_id to match the artifact you create`);
  console.log(`  5. Register both in lib/puzzle-loader.ts`);
  console.log(`  6. Verify: npm run puzzle -- show ${puzzleId}`);
  console.log(`             npm run artifact -- status\n`);
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
  status              List all puzzles with question preview and artifact link
  show <id>           Print full puzzle content (question, facts, answer)
  new <week-id>       Scaffold a new puzzle skeleton for the given ISO week

Examples:
  npx tsx scripts/puzzle.ts status
  npx tsx scripts/puzzle.ts show puzzle_2026_w35
  npx tsx scripts/puzzle.ts new 2026-W36
  npx tsx scripts/puzzle.ts new 2026-W37

Week ID format: YYYY-WNN  (e.g. 2026-W36)
Puzzle files:   data/puzzles/<puzzle_id>.json

After creating a puzzle, register it in lib/puzzle-loader.ts
and create its artifact with: npm run artifact -- new <artifact_id>
`);
    break;
}
