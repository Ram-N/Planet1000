/**
 * build-puzzles — Assembles full WeeklyPuzzle JSONs from slim manifests.
 *
 * Run with: npm run build:puzzles
 * Run with: npm run build:puzzles -- --allow-missing   (warn instead of error on missing facts)
 *
 * Reads:
 *   data/puzzles/*.json          — slim PuzzleSource manifests
 *   data/generated/world-model.json  — observations (value, unit, etc.)
 *   data/canonical-facts.csv    — facts with source attribution
 *
 * Writes:
 *   data/generated/puzzles/<id>.json  — full WeeklyPuzzle ready for puzzle-loader.ts
 */

import fs from 'fs';
import path from 'path';

// ── Paths ─────────────────────────────────────────────────────────────────────

const ROOT             = path.join(__dirname, '..');
const PUZZLES_DIR      = path.join(ROOT, 'data', 'puzzles');
const WORLD_MODEL_FILE = path.join(ROOT, 'data', 'generated', 'world-model.json');
const FACTS_FILE       = path.join(ROOT, 'data', 'canonical-facts.csv');
const OUT_DIR          = path.join(ROOT, 'data', 'generated', 'puzzles');
const ARTIFACTS_DIR    = path.join(ROOT, 'data', 'artifacts');
const LOADER_FILE      = path.join(ROOT, 'lib', 'puzzle-loader.ts');

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
  value: number;
  unit_id: string;
  unit?: { symbol: string };
}

interface WorldModel {
  world_population: number;
  observations: WorldObservation[];
}

// ── CSV parser (same logic as build-world-model.ts) ──────────────────────────

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

function parseCSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
    rows.push(row);
  }
  return rows;
}

// ── Source field parser ───────────────────────────────────────────────────────

/**
 * Splits a free-text source field (e.g. "UN-Habitat https://unhabitat.org")
 * into separate label and URL components.
 */
function parseSource(raw: string): { source_label?: string; source_url?: string } {
  if (!raw?.trim()) return {};

  const urlMatch = raw.match(/https?:\/\/\S+/);
  if (!urlMatch) {
    return { source_label: raw.trim() };
  }

  // Strip trailing parentheses/punctuation from the URL
  let url = urlMatch[0].replace(/[().,]+$/, '');

  // The label is everything before the URL, minus trailing whitespace/parens
  const labelPart = raw.slice(0, urlMatch.index).replace(/[(\s]+$/, '').trim();

  const result: { source_label?: string; source_url?: string } = { source_url: url };
  if (labelPart) result.source_label = labelPart;
  return result;
}

// ── Load world model ──────────────────────────────────────────────────────────

function loadWorldModel(): WorldModel {
  if (!fs.existsSync(WORLD_MODEL_FILE)) {
    console.error(`✗ world-model.json not found: ${WORLD_MODEL_FILE}`);
    console.error('  Run: npm run build:data');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(WORLD_MODEL_FILE, 'utf-8')) as WorldModel;
}

// ── Load canonical facts grouped by (observation_id, type) ───────────────────

interface FactRow { observation_id: string; type: string; text: string; source: string; year: string; }

function loadFactsByObsAndType(): Map<string, Map<string, FactRow[]>> {
  if (!fs.existsSync(FACTS_FILE)) {
    console.error(`✗ canonical-facts.csv not found: ${FACTS_FILE}`);
    process.exit(1);
  }

  const rows = parseCSV(FACTS_FILE) as unknown as FactRow[];
  // outer key: observation_id; inner key: type ('relationship'|'temporal'|'anchor')
  const byObs = new Map<string, Map<string, FactRow[]>>();

  for (const row of rows) {
    const obsId = row.observation_id?.trim();
    const type  = row.type?.trim();
    if (!obsId || !type) continue;

    if (!byObs.has(obsId)) byObs.set(obsId, new Map());
    const byType = byObs.get(obsId)!;
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)!.push(row);
  }

  return byObs;
}

// ── Build one puzzle ──────────────────────────────────────────────────────────

function buildPuzzle(
  source: PuzzleSource,
  obsIndex: Map<string, WorldObservation>,
  factIndex: Map<string, Map<string, FactRow[]>>,
  worldPopulation: number,
  allowMissing: boolean,
): WeeklyPuzzle | null {
  const obs = obsIndex.get(source.observation_id);
  if (!obs) {
    console.error(`  ✗ observation_id "${source.observation_id}" not found in world-model.json`);
    return null;
  }

  // Compute answer
  const answer_value_1k = Math.round(obs.value / worldPopulation * 1000);
  const answer_unit     = obs.unit?.symbol ?? obs.unit_id ?? 'people';

  // Select facts
  const byType = factIndex.get(source.observation_id);
  const warnings: string[] = [];

  function pickFact(type: string): PuzzleFact | null {
    const rows = byType?.get(type) ?? [];
    if (rows.length === 0) {
      warnings.push(`missing ${type} fact`);
      return null;
    }
    const row = rows[0]; // first fact of this type
    const fact: PuzzleFact = { text: row.text };
    const { source_label, source_url } = parseSource(row.source);
    if (source_label) fact.source_label = source_label;
    if (source_url)   fact.source_url   = source_url;
    return fact;
  }

  const relationship_fact = pickFact('relationship');
  const temporal_fact     = pickFact('temporal');
  const anchor_fact       = pickFact('anchor');

  const missingTypes = [
    !relationship_fact && 'relationship',
    !temporal_fact     && 'temporal',
    !anchor_fact       && 'anchor',
  ].filter(Boolean) as string[];

  if (missingTypes.length > 0) {
    const msg = `${source.id} (${source.observation_id}): missing ${missingTypes.join(', ')} fact(s)`;
    if (allowMissing) {
      console.warn(`  ⚠ ${msg}`);
    } else {
      console.error(`  ✗ ${msg}`);
      console.error('    Add facts to canonical-facts.csv, or use --allow-missing to build anyway.');
      return null;
    }
  }

  // Placeholder for missing facts when --allow-missing is set
  const PLACEHOLDER: PuzzleFact = { text: '(fact not yet authored — add to canonical-facts.csv)' };

  return {
    id:               source.id,
    week_id:          source.week_id,
    publish_date:     source.publish_date,
    domain:           source.domain,
    question:         source.question,
    answer_value_1k,
    answer_unit,
    answer_explanation: source.answer_explanation,
    relationship_fact:  relationship_fact ?? PLACEHOLDER,
    temporal_fact:      temporal_fact     ?? PLACEHOLDER,
    anchor_fact:        anchor_fact       ?? PLACEHOLDER,
    artifact_id:      source.artifact_id,
  };
}

// ── Loader generator ──────────────────────────────────────────────────────────

/**
 * Rewrites lib/puzzle-loader.ts based on whatever JSON files exist in
 * data/generated/puzzles/ — so the loader always matches the build output
 * without any manual edits.
 */
function generateLoader(): void {
  const generatedFiles = fs.existsSync(OUT_DIR)
    ? fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.json')).sort()
    : [];

  // Collect puzzle IDs and their artifact_ids
  const puzzleIds: string[] = [];
  const artifactIds = new Set<string>();

  for (const file of generatedFiles) {
    try {
      const puzzle = JSON.parse(fs.readFileSync(path.join(OUT_DIR, file), 'utf-8'));
      puzzleIds.push(puzzle.id as string);
      if (puzzle.artifact_id) artifactIds.add(puzzle.artifact_id as string);
    } catch {
      // skip malformed files
    }
  }

  // Only import artifacts that actually exist on disk
  const validArtifactIds = [...artifactIds]
    .sort()
    .filter((id) => fs.existsSync(path.join(ARTIFACTS_DIR, `${id}.json`)));

  const lines = [
    `import type { WeeklyPuzzle, KnowledgeArtifact } from '@/types/puzzle';`,
    ``,
    `// Static puzzle registry — regenerated by: npm run build:puzzles`,
    ...puzzleIds.map((id) => `import ${id} from '@/data/generated/puzzles/${id}.json';`),
    ...validArtifactIds.map((id) => `import ${id} from '@/data/artifacts/${id}.json';`),
    ``,
    `const PUZZLES: WeeklyPuzzle[] = [`,
    ...puzzleIds.map((id) => `  ${id} as WeeklyPuzzle,`),
    `];`,
    ``,
    `const ARTIFACTS: KnowledgeArtifact[] = [`,
    ...validArtifactIds.map((id) => `  ${id} as KnowledgeArtifact,`),
    `];`,
    ``,
    `/** Returns the ISO week string for a given date, e.g. "2026-W35". */`,
    `function getISOWeekId(date: Date = new Date()): string {`,
    `  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));`,
    `  const dayOfWeek = d.getUTCDay() || 7; // Monday = 1 ... Sunday = 7`,
    `  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);`,
    `  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));`,
    `  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);`,
    `  return \`\${d.getUTCFullYear()}-W\${String(weekNumber).padStart(2, '0')}\`;`,
    `}`,
    ``,
    `/**`,
    ` * Returns the puzzle for the current ISO week, or the most recently`,
    ` * published puzzle if no puzzle exists for this week yet.`,
    ` */`,
    `export function getCurrentWeeklyPuzzle(): WeeklyPuzzle {`,
    `  const weekId = getISOWeekId();`,
    `  const exact = PUZZLES.find((p) => p.week_id === weekId);`,
    `  if (exact) return exact;`,
    ``,
    `  // Fall back to the most recent available puzzle`,
    `  const sorted = [...PUZZLES].sort((a, b) =>`,
    `    b.publish_date.localeCompare(a.publish_date),`,
    `  );`,
    `  return sorted[0];`,
    `}`,
    ``,
    `export function getPuzzleById(id: string): WeeklyPuzzle | null {`,
    `  return PUZZLES.find((p) => p.id === id) ?? null;`,
    `}`,
    ``,
    `export function getArtifactById(id: string): KnowledgeArtifact | null {`,
    `  return ARTIFACTS.find((a) => a.id === id) ?? null;`,
    `}`,
    ``,
  ];

  fs.writeFileSync(LOADER_FILE, lines.join('\n'));
  console.log(`  ✓ lib/puzzle-loader.ts updated (${puzzleIds.length} puzzle${puzzleIds.length === 1 ? '' : 's'}, ${validArtifactIds.length} artifact${validArtifactIds.length === 1 ? '' : 's'})`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main(): void {
  const allowMissing = process.argv.includes('--allow-missing');

  // Load data
  const worldModel  = loadWorldModel();
  const obsIndex    = new Map(worldModel.observations.map((o) => [o.id, o]));
  const factIndex   = loadFactsByObsAndType();

  // Find slim manifests
  if (!fs.existsSync(PUZZLES_DIR)) {
    console.log('No puzzles found (data/puzzles/ does not exist).');
    return;
  }
  const files = fs.readdirSync(PUZZLES_DIR).filter((f) => f.endsWith('.json')).sort();
  if (files.length === 0) {
    console.log('No puzzle manifests found in data/puzzles/.');
    return;
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  let built = 0;
  let failed = 0;
  const allWarnings: string[] = [];

  for (const file of files) {
    const filePath = path.join(PUZZLES_DIR, file);
    let source: PuzzleSource;
    try {
      source = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PuzzleSource;
    } catch (e) {
      console.error(`  ✗ Failed to parse ${file}: ${(e as Error).message}`);
      failed++;
      continue;
    }

    if (!source.observation_id) {
      console.error(`  ✗ ${file}: missing observation_id (is this a legacy full-puzzle file?)`);
      failed++;
      continue;
    }

    console.log(`  Building ${source.id} (obs: ${source.observation_id})…`);
    const puzzle = buildPuzzle(source, obsIndex, factIndex, worldModel.world_population, allowMissing);

    if (!puzzle) {
      failed++;
      continue;
    }

    const outPath = path.join(OUT_DIR, `${source.id}.json`);
    fs.writeFileSync(outPath, JSON.stringify(puzzle, null, 2) + '\n');
    console.log(`    ✓ answer_value_1k = ${puzzle.answer_value_1k} ${puzzle.answer_unit}`);
    built++;
  }

  console.log('');
  console.log(`Built ${built} puzzle${built === 1 ? '' : 's'}.${failed > 0 ? ` Failed: ${failed}.` : ''}`);
  if (failed > 0 && !allowMissing) {
    console.log('  Tip: use --allow-missing to build incomplete puzzles for previewing.');
    process.exit(1);
  }

  generateLoader();
}

console.log('\nPlanet1000 — build:puzzles');
console.log('─'.repeat(50));
main();
