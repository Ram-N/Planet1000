/**
 * artifact — Creator tool for managing Planet1000 Knowledge Artifacts.
 *
 * Commands:
 *   npx tsx scripts/artifact.ts status
 *   npx tsx scripts/artifact.ts new <id>
 *   npx tsx scripts/artifact.ts validate [id]
 *
 * status
 *   Lists all artifacts and all puzzles. Shows which puzzles reference
 *   which artifacts, flags broken links, and flags puzzles with no artifact.
 *
 * new <id>
 *   Creates a skeleton artifact JSON at data/artifacts/<id>.json.
 *   The id should be kebab-case, e.g. "artifact_global_doctors".
 *   Opens the file path so you know where to fill in the content.
 *
 * validate [id]
 *   Validates artifact JSON structure against required fields and
 *   known section types. If id is omitted, validates all artifacts.
 *
 * Artifacts live in:  data/artifacts/
 * Puzzles live in:    data/puzzles/
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ── Paths ─────────────────────────────────────────────────────────────────────

const ROOT          = path.join(__dirname, '..');
const ARTIFACTS_DIR = path.join(ROOT, 'data', 'artifacts');
const PUZZLES_DIR   = path.join(ROOT, 'data', 'puzzles');

// ── Types (mirrors types/puzzle.ts) ──────────────────────────────────────────

type SectionType = 'text' | 'bullet_list' | 'bar_chart' | 'table' | 'sources';
const VALID_SECTION_TYPES: SectionType[] = ['text', 'bullet_list', 'bar_chart', 'table', 'sources'];

interface ArtifactSection {
  type: SectionType;
  [key: string]: unknown;
}

interface KnowledgeArtifact {
  id: string;
  title: string;
  description: string;
  domain: string;
  data_year: number;
  updated_at: string;
  sections: ArtifactSection[];
  related_artifact_ids: string[];
}

interface WeeklyPuzzle {
  id: string;
  week_id: string;
  publish_date: string;
  domain: string;
  question: string;
  artifact_id: string;
}

// ── File loaders ──────────────────────────────────────────────────────────────

function loadArtifact(filePath: string): { data: KnowledgeArtifact; errors: string[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return { data: null as unknown as KnowledgeArtifact, errors: [`JSON parse error: ${(e as Error).message}`] };
  }
  return { data: raw as KnowledgeArtifact, errors: [] };
}

function listArtifacts(): Array<{ file: string; id: string; data: KnowledgeArtifact | null; parseError?: string }> {
  if (!fs.existsSync(ARTIFACTS_DIR)) return [];
  return fs.readdirSync(ARTIFACTS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => {
      const filePath = path.join(ARTIFACTS_DIR, f);
      const { data, errors } = loadArtifact(filePath);
      return {
        file: f,
        id: f.replace(/\.json$/, ''),
        data: errors.length ? null : data,
        parseError: errors[0],
      };
    });
}

function listPuzzles(): Array<{ file: string; data: WeeklyPuzzle | null; parseError?: string }> {
  if (!fs.existsSync(PUZZLES_DIR)) return [];
  return fs.readdirSync(PUZZLES_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => {
      const filePath = path.join(PUZZLES_DIR, f);
      let data: WeeklyPuzzle | null = null;
      let parseError: string | undefined;
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as WeeklyPuzzle;
      } catch (e) {
        parseError = (e as Error).message;
      }
      return { file: f, data, parseError };
    });
}

// ── STATUS command ────────────────────────────────────────────────────────────

function cmdStatus(): void {
  const artifacts = listArtifacts();
  const puzzles   = listPuzzles();

  const artifactIds = new Set(artifacts.map(a => a.id));

  console.log('\nPlanet1000 Knowledge Artifacts');
  console.log('─'.repeat(50));
  console.log(`Artifacts: ${artifacts.length}   Puzzles: ${puzzles.length}`);

  // ── Artifacts table ────────────────────────────────────────────────────────
  console.log('\nArtifacts:');
  if (artifacts.length === 0) {
    console.log('  (none — create one with: artifact new <id>)');
  } else {
    for (const a of artifacts) {
      if (a.parseError) {
        console.log(`  ✗ ${a.file}  — PARSE ERROR: ${a.parseError}`);
        continue;
      }
      const d = a.data!;
      const sectionSummary = d.sections
        .map(s => s.type)
        .reduce((acc: Record<string, number>, t) => { acc[t] = (acc[t] ?? 0) + 1; return acc; }, {});
      const sectionStr = Object.entries(sectionSummary)
        .map(([t, n]) => `${n}×${t}`)
        .join(', ');
      const refs = d.related_artifact_ids.length > 0
        ? ` → [${d.related_artifact_ids.join(', ')}]`
        : '';
      console.log(`  ✓ ${a.id.padEnd(38)} ${d.data_year}  ${sectionStr}${refs}`);
    }
  }

  // ── Puzzles table ──────────────────────────────────────────────────────────
  console.log('\nPuzzles:');
  if (puzzles.length === 0) {
    console.log('  (none)');
  } else {
    for (const p of puzzles) {
      if (p.parseError) {
        console.log(`  ✗ ${p.file}  — PARSE ERROR: ${p.parseError}`);
        continue;
      }
      const d = p.data!;
      const hasArtifact = artifactIds.has(d.artifact_id);
      const artifactMark = hasArtifact ? `→ ${d.artifact_id}` : `→ ${d.artifact_id}  ✗ MISSING`;
      console.log(`  ${d.week_id.padEnd(10)} ${d.id.padEnd(22)} ${artifactMark}`);
    }
  }

  // ── Orphaned artifacts (not referenced by any puzzle) ─────────────────────
  const referencedIds = new Set(
    puzzles.filter(p => p.data).map(p => p.data!.artifact_id)
  );
  const orphans = artifacts.filter(a => a.data && !referencedIds.has(a.id));
  if (orphans.length > 0) {
    console.log('\nOrphaned artifacts (not referenced by any puzzle):');
    for (const a of orphans) {
      console.log(`  ${a.id}`);
    }
  }

  // ── Summary flags ─────────────────────────────────────────────────────────
  const brokenLinks = puzzles.filter(p => p.data && !artifactIds.has(p.data.artifact_id));
  if (brokenLinks.length > 0) {
    console.log(`\n⚠ ${brokenLinks.length} puzzle(s) reference a missing artifact:`);
    for (const p of brokenLinks) {
      console.log(`  ${p.data!.id}  references  ${p.data!.artifact_id}`);
    }
  }

  console.log('');
}

// ── NEW command ───────────────────────────────────────────────────────────────

const SKELETON: KnowledgeArtifact = {
  id: '__ID__',
  title: '',
  description: '',
  domain: '',
  data_year: new Date().getFullYear(),
  updated_at: new Date().toISOString().slice(0, 10),
  sections: [
    {
      type: 'bar_chart',
      heading: '',
      caption: '',
      x_label: '',
      bars: [
        { label: 'Region A', value: 0 },
        { label: 'Region B', value: 0 },
      ],
    },
    {
      type: 'table',
      heading: '',
      columns: ['Column 1', 'Column 2', 'Column 3'],
      rows: [
        { cells: ['', '', ''] },
      ],
    },
    {
      type: 'bullet_list',
      heading: '',
      items: [
        { icon: '🌍', label: 'Region A', value: '', note: '' },
      ],
    },
    {
      type: 'sources',
      heading: 'Key Data Sources',
      sources: [
        { title: '', description: '', url: '' },
      ],
    },
  ],
  related_artifact_ids: [],
};

async function cmdNew(id: string): Promise<void> {
  if (!id) {
    console.error('\nUsage: artifact new <id>');
    console.error('  Example: artifact new artifact_global_doctors');
    process.exit(1);
  }

  if (!/^[a-z0-9_]+$/.test(id)) {
    console.error(`\n✗ ID "${id}" must match /^[a-z0-9_]+$/ (lowercase, digits, underscores)`);
    process.exit(1);
  }

  const outPath = path.join(ARTIFACTS_DIR, `${id}.json`);

  if (fs.existsSync(outPath)) {
    console.error(`\n✗ File already exists: ${outPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const skeleton = JSON.parse(JSON.stringify(SKELETON)) as KnowledgeArtifact;
  skeleton.id = id;

  // Prompt for the fields a script can usefully ask about
  const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> =>
    new Promise(resolve => rl.question(q, a => resolve(a.trim())));

  console.log(`\n── New Artifact: ${id} ──`);
  console.log('Fill in a few basics. Sections are pre-scaffolded — edit the JSON file to complete them.\n');

  skeleton.title       = await ask('Title (e.g. "Global Homelessness"): ');
  skeleton.description = await ask('One-line description: ');

  const domainOpts = 'people/healthcare/education/food/water/energy/housing/transportation/money/environment';
  skeleton.domain  = await ask(`Domain [${domainOpts}]: `);

  const yearRaw = await ask(`Data year [${skeleton.data_year}]: `);
  if (yearRaw && /^\d{4}$/.test(yearRaw)) skeleton.data_year = parseInt(yearRaw, 10);

  rl.close();

  fs.writeFileSync(outPath, JSON.stringify(skeleton, null, 2) + '\n');

  console.log(`\n✓ Created: ${outPath}`);
  console.log('\nNext steps:');
  console.log('  1. Open the file and fill in each section\'s content');
  console.log('  2. Delete any section types you don\'t need');
  console.log('  3. Add more sections of any type if needed');
  console.log('  4. Run: npx tsx scripts/artifact.ts validate ' + id);
  console.log('  5. Reference this artifact from a puzzle via artifact_id\n');
}

// ── VALIDATE command ──────────────────────────────────────────────────────────

interface ValidationResult {
  id: string;
  file: string;
  errors: string[];
  warnings: string[];
}

function validateArtifact(a: KnowledgeArtifact, file: string): ValidationResult {
  const errors: string[]   = [];
  const warnings: string[] = [];

  // Required top-level fields
  if (!a.id)          errors.push('missing: id');
  if (!a.title)       errors.push('missing: title');
  if (!a.description) warnings.push('empty: description');
  if (!a.domain)      errors.push('missing: domain');
  if (!a.data_year)   errors.push('missing: data_year');
  if (!a.updated_at)  warnings.push('empty: updated_at');

  // id matches filename
  const expectedId = file.replace(/\.json$/, '');
  if (a.id && a.id !== expectedId) {
    errors.push(`id "${a.id}" does not match filename "${expectedId}"`);
  }

  // sections
  if (!Array.isArray(a.sections)) {
    errors.push('sections must be an array');
  } else if (a.sections.length === 0) {
    warnings.push('sections is empty — artifact has no content');
  } else {
    for (let i = 0; i < a.sections.length; i++) {
      const s = a.sections[i];
      const prefix = `sections[${i}]`;

      if (!s.type) {
        errors.push(`${prefix}: missing type`);
        continue;
      }
      if (!VALID_SECTION_TYPES.includes(s.type as SectionType)) {
        errors.push(`${prefix}: unknown type "${s.type}" (valid: ${VALID_SECTION_TYPES.join(', ')})`);
        continue;
      }

      // Per-type required fields
      switch (s.type) {
        case 'text':
          if (!s['body']) errors.push(`${prefix} (text): missing body`);
          break;
        case 'bullet_list':
          if (!s['heading']) warnings.push(`${prefix} (bullet_list): missing heading`);
          if (!Array.isArray(s['items']) || (s['items'] as unknown[]).length === 0)
            errors.push(`${prefix} (bullet_list): items must be a non-empty array`);
          break;
        case 'bar_chart':
          if (!s['heading'])  warnings.push(`${prefix} (bar_chart): missing heading`);
          if (!s['x_label'])  warnings.push(`${prefix} (bar_chart): missing x_label`);
          if (!Array.isArray(s['bars']) || (s['bars'] as unknown[]).length === 0)
            errors.push(`${prefix} (bar_chart): bars must be a non-empty array`);
          else {
            (s['bars'] as Array<{ label?: unknown; value?: unknown }>).forEach((b, bi) => {
              if (!b.label) errors.push(`${prefix} (bar_chart) bars[${bi}]: missing label`);
              if (typeof b.value !== 'number') errors.push(`${prefix} (bar_chart) bars[${bi}]: value must be a number`);
            });
          }
          break;
        case 'table':
          if (!Array.isArray(s['columns']) || (s['columns'] as unknown[]).length === 0)
            errors.push(`${prefix} (table): columns must be a non-empty array`);
          if (!Array.isArray(s['rows']) || (s['rows'] as unknown[]).length === 0)
            warnings.push(`${prefix} (table): rows is empty`);
          else {
            const colCount = Array.isArray(s['columns']) ? (s['columns'] as unknown[]).length : 0;
            (s['rows'] as Array<{ cells?: unknown[] }>).forEach((r, ri) => {
              if (!Array.isArray(r.cells))
                errors.push(`${prefix} (table) rows[${ri}]: cells must be an array`);
              else if (r.cells.length !== colCount)
                warnings.push(`${prefix} (table) rows[${ri}]: has ${r.cells.length} cells but ${colCount} columns`);
            });
          }
          break;
        case 'sources':
          if (!s['heading'])  warnings.push(`${prefix} (sources): missing heading`);
          if (!Array.isArray(s['sources']) || (s['sources'] as unknown[]).length === 0)
            errors.push(`${prefix} (sources): sources must be a non-empty array`);
          else {
            (s['sources'] as Array<{ title?: unknown; description?: unknown }>).forEach((src, si) => {
              if (!src.title)       errors.push(`${prefix} (sources) sources[${si}]: missing title`);
              if (!src.description) warnings.push(`${prefix} (sources) sources[${si}]: missing description`);
            });
          }
          break;
      }
    }
  }

  // related_artifact_ids
  if (!Array.isArray(a.related_artifact_ids)) {
    errors.push('related_artifact_ids must be an array');
  }

  return { id: a.id ?? file.replace(/\.json$/, ''), file, errors, warnings };
}

function cmdValidate(targetId?: string): void {
  const artifacts = targetId
    ? (() => {
        const f = `${targetId}.json`;
        const p = path.join(ARTIFACTS_DIR, f);
        if (!fs.existsSync(p)) {
          console.error(`\n✗ Artifact not found: ${p}`);
          process.exit(1);
        }
        const { data, errors } = loadArtifact(p);
        return [{ file: f, id: targetId, data: errors.length ? null : data, parseError: errors[0] }];
      })()
    : listArtifacts();

  if (artifacts.length === 0) {
    console.log('\nNo artifacts to validate.');
    return;
  }

  const results: ValidationResult[] = [];

  for (const a of artifacts) {
    if (a.parseError || !a.data) {
      results.push({ id: a.id, file: a.file, errors: [`JSON parse error: ${a.parseError}`], warnings: [] });
    } else {
      results.push(validateArtifact(a.data, a.file));
    }
  }

  console.log(`\nValidating ${results.length} artifact${results.length === 1 ? '' : 's'}…\n`);

  let hasErrors = false;
  for (const r of results) {
    if (r.errors.length === 0 && r.warnings.length === 0) {
      console.log(`  ✓ ${r.id}`);
    } else {
      if (r.errors.length > 0) {
        hasErrors = true;
        console.log(`  ✗ ${r.id}`);
        for (const e of r.errors)   console.log(`      error:   ${e}`);
      } else {
        console.log(`  ✓ ${r.id}  (with warnings)`);
      }
      for (const w of r.warnings) console.log(`      warning: ${w}`);
    }
  }

  const errCount  = results.reduce((n, r) => n + r.errors.length, 0);
  const warnCount = results.reduce((n, r) => n + r.warnings.length, 0);
  console.log(`\n${errCount} error(s), ${warnCount} warning(s)\n`);

  if (hasErrors) process.exit(1);
}

// ── Entry point ───────────────────────────────────────────────────────────────

const [, , command, ...cmdArgs] = process.argv;

switch (command) {
  case 'status':
    cmdStatus();
    break;

  case 'new':
    cmdNew(cmdArgs[0]).catch(err => { console.error(err); process.exit(1); });
    break;

  case 'validate':
    cmdValidate(cmdArgs[0]);
    break;

  default:
    console.log(`
artifact — Planet1000 Knowledge Artifact manager

Commands:
  status              List all artifacts and puzzles; show links and flags
  new <id>            Scaffold a new artifact JSON with all section types
  validate [id]       Check artifact structure; omit id to validate all

Artifact IDs use lowercase + underscores, e.g.:
  artifact_global_homelessness
  artifact_global_doctors
  artifact_co2_emissions

Files:
  data/artifacts/<id>.json   — artifact content
  data/puzzles/<id>.json     — weekly puzzles (reference artifact_id)

Section types supported in artifacts:
  bar_chart     Horizontal bar chart (heading, bars[], x_label)
  table         Data table (columns[], rows[])
  bullet_list   Bullet points (heading, items[])
  sources       Numbered source list (heading, sources[])
  text          Plain text block (heading?, body)

Examples:
  npx tsx scripts/artifact.ts status
  npx tsx scripts/artifact.ts new artifact_global_doctors
  npx tsx scripts/artifact.ts validate
  npx tsx scripts/artifact.ts validate artifact_global_homelessness
`);
    break;
}
