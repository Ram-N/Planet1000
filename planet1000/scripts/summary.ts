/**
 * summary — Creator tool for managing Planet1000 Knowledge Summaries.
 *
 * Commands:
 *   npm run summary -- status
 *   npm run summary -- build <id> [--force]
 *   npm run summary -- new <id>
 *   npm run summary -- validate [id]
 *
 * build <id>
 *   Reads source material from data/source/summary-input/<topic>/
 *   (images + optional text files), calls the Claude API, and writes
 *   a fully-populated summary JSON to data/summaries/<id>.json.
 *   Requires ANTHROPIC_API_KEY in the environment.
 *   Use --force to overwrite an existing summary.
 *
 * new <id>
 *   Scaffolds a blank skeleton summary JSON for manual editing.
 *   Use this only if you have no source images — prefer `build`.
 *
 * status
 *   Lists all summaries and puzzles; shows links and flags broken refs.
 *
 * validate [id]
 *   Validates summary JSON structure. Omit id to validate all.
 *
 * Source images live in:  data/source/summary-input/<topic>/
 * Summaries live in:      data/summaries/
 * Puzzles live in:        data/puzzles/
 */

import * as fs   from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import Anthropic from '@anthropic-ai/sdk';

// ── Paths ─────────────────────────────────────────────────────────────────────

const ROOT              = path.join(__dirname, '..');
const SUMMARIES_DIR     = path.join(ROOT, 'data', 'summaries');
const PUZZLES_DIR       = path.join(ROOT, 'data', 'puzzles');
const SUMMARY_INPUT_DIR = path.join(ROOT, 'data', 'source', 'summary-input');

// ── Types (mirrors types/puzzle.ts) ──────────────────────────────────────────

type SectionType = 'text' | 'bullet_list' | 'bar_chart' | 'table' | 'sources';
const VALID_SECTION_TYPES: SectionType[] = ['text', 'bullet_list', 'bar_chart', 'table', 'sources'];

interface ArtifactSection {
  type: SectionType;
  [key: string]: unknown;
}

interface KnowledgeSummary {
  id: string;
  title: string;
  description: string;
  domain: string;
  data_year: number;
  updated_at: string;
  sections: ArtifactSection[];
  related_summary_ids: string[];
}

interface WeeklyPuzzle {
  id: string;
  week_id: string;
  publish_date: string;
  domain: string;
  question: string;
  summary_id: string;
}

// ── File loaders ──────────────────────────────────────────────────────────────

function loadArtifact(filePath: string): { data: KnowledgeSummary; errors: string[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return { data: null as unknown as KnowledgeSummary, errors: [`JSON parse error: ${(e as Error).message}`] };
  }
  return { data: raw as KnowledgeSummary, errors: [] };
}

function listArtifacts(): Array<{ file: string; id: string; data: KnowledgeSummary | null; parseError?: string }> {
  if (!fs.existsSync(SUMMARIES_DIR)) return [];
  return fs.readdirSync(SUMMARIES_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => {
      const filePath = path.join(SUMMARIES_DIR, f);
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

  console.log('\nArtifacts:');
  if (artifacts.length === 0) {
    console.log('  (none — run: artifact build <id>)');
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
      const sectionStr = Object.entries(sectionSummary).map(([t, n]) => `${n}×${t}`).join(', ');
      const refs = d.related_summary_ids.length > 0 ? ` → [${d.related_summary_ids.join(', ')}]` : '';
      console.log(`  ✓ ${a.id.padEnd(38)} ${d.data_year}  ${sectionStr}${refs}`);
    }
  }

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
      const hasArtifact = artifactIds.has(d.summary_id);
      const artifactMark = hasArtifact ? `→ ${d.summary_id}` : `→ ${d.summary_id}  ✗ MISSING`;
      console.log(`  ${d.week_id.padEnd(10)} ${d.id.padEnd(22)} ${artifactMark}`);
    }
  }

  const referencedIds = new Set(puzzles.filter(p => p.data).map(p => p.data!.summary_id));
  const orphans = artifacts.filter(a => a.data && !referencedIds.has(a.id));
  if (orphans.length > 0) {
    console.log('\nOrphaned artifacts (not referenced by any puzzle):');
    for (const a of orphans) console.log(`  ${a.id}`);
  }

  const brokenLinks = puzzles.filter(p => p.data && !artifactIds.has(p.data.summary_id));
  if (brokenLinks.length > 0) {
    console.log(`\n⚠ ${brokenLinks.length} puzzle(s) reference a missing artifact:`);
    for (const p of brokenLinks) console.log(`  ${p.data!.id}  references  ${p.data!.summary_id}`);
  }

  console.log('');
}

// ── BUILD command ─────────────────────────────────────────────────────────────

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const TEXT_EXTS  = new Set(['.txt', '.md']);

/**
 * Derives the summary-input folder name from an artifact ID.
 *   artifact_internet_access  →  internet-access
 *   artifact_people_internet  →  people-internet
 *
 * Checks multiple candidates so both hyphenated and underscored
 * folder names work.
 */
function resolveInputDir(artifactId: string): string | null {
  const base = artifactId.replace(/^artifact_/, '');
  const candidates = [
    path.join(SUMMARY_INPUT_DIR, base.replace(/_/g, '-')),  // internet-access
    path.join(SUMMARY_INPUT_DIR, base),                      // internet_access
    path.join(SUMMARY_INPUT_DIR, artifactId),                // artifact_internet_access
  ];
  return candidates.find(d => fs.existsSync(d)) ?? null;
}

async function cmdBuild(id: string, force: boolean): Promise<void> {
  if (!id) {
    console.error('\nUsage: artifact build <id> [--force]');
    console.error('  Example: npm run summary -- build artifact_people_internet');
    process.exit(1);
  }

  // Resolve input folder
  const inputDir = resolveInputDir(id);
  if (!inputDir) {
    const expected = path.join(SUMMARY_INPUT_DIR, id.replace(/^artifact_/, '').replace(/_/g, '-'));
    console.error(`\n✗ No source folder found. Create one at:`);
    console.error(`    ${expected}`);
    console.error('  Add screenshots (.png, .jpg) and/or notes (.txt, .md) there, then re-run.');
    process.exit(1);
  }

  // Check output
  const outPath = path.join(SUMMARIES_DIR, `${id}.json`);
  if (fs.existsSync(outPath) && !force) {
    console.error(`\n✗ ${outPath} already exists.`);
    console.error('  Use --force to overwrite.');
    process.exit(1);
  }

  // Collect files
  const allFiles    = fs.readdirSync(inputDir).sort();
  const imageFiles  = allFiles.filter(f => IMAGE_EXTS.has(path.extname(f).toLowerCase()));
  const textFiles   = allFiles.filter(f => TEXT_EXTS.has(path.extname(f).toLowerCase()));

  if (imageFiles.length === 0 && textFiles.length === 0) {
    console.error(`\n✗ No usable files in ${inputDir}`);
    console.error('  Add screenshots (.png .jpg .jpeg .webp) or notes (.txt .md).');
    process.exit(1);
  }

  console.log(`\n── Building: ${id} ──`);
  console.log(`  Source: ${path.relative(ROOT, inputDir)}`);
  if (imageFiles.length) console.log(`  Images (${imageFiles.length}): ${imageFiles.join(', ')}`);
  if (textFiles.length)  console.log(`  Text   (${textFiles.length}): ${textFiles.join(', ')}`);
  console.log('  Calling Claude API…\n');

  // Require API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('✗ ANTHROPIC_API_KEY environment variable is not set.');
    console.error('  Export it before running: export ANTHROPIC_API_KEY=sk-ant-...');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const today  = new Date().toISOString().slice(0, 10);

  // Build content blocks for the API call
  type ImageBlock = { type: 'image'; source: { type: 'base64'; media_type: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'; data: string } };
  type TextBlock  = { type: 'text'; text: string };
  const blocks: Array<ImageBlock | TextBlock> = [];

  for (const file of imageFiles) {
    const data  = fs.readFileSync(path.join(inputDir, file)).toString('base64');
    const ext   = path.extname(file).toLowerCase();
    const mime  = (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg'
                : ext === '.webp' ? 'image/webp'
                : ext === '.gif'  ? 'image/gif'
                : 'image/png';
    blocks.push({ type: 'image', source: { type: 'base64', media_type: mime as 'image/png', data } });
  }

  for (const file of textFiles) {
    const text = fs.readFileSync(path.join(inputDir, file), 'utf-8');
    blocks.push({ type: 'text', text: `=== ${file} ===\n${text}` });
  }

  const systemPrompt =
    'You are generating a Planet1000 knowledge artifact JSON.\n\n' +
    'Planet1000 is an educational game where world statistics are scaled to a village of 1,000 people. ' +
    'The artifact is a summary page students browse after completing a puzzle — ' +
    'informative, faithful to the source data, written for a curious general audience.\n\n' +
    'Return ONLY valid JSON — no markdown fences, no explanation, nothing else.';

  const userPrompt =
    `Generate an artifact JSON for id "${id}" from the provided source material.\n\n` +
    `Schema:\n` +
    `{\n` +
    `  "id": "${id}",\n` +
    `  "title": "...",\n` +
    `  "description": "...",      // 1–2 sentences\n` +
    `  "domain": "...",           // one of: people, healthcare, education, food, water, energy, housing, transportation, money, environment, technology\n` +
    `  "data_year": <number>,\n` +
    `  "updated_at": "${today}",\n` +
    `  "sections": [...],\n` +
    `  "related_summary_ids": []\n` +
    `}\n\n` +
    `Section types — use whichever are present in the source material:\n\n` +
    `  bar_chart:   { "type": "bar_chart",   "heading": "...", "caption": "...", "x_label": "...", "bars": [{ "label": "...", "value": <number> }] }\n` +
    `  table:       { "type": "table",       "heading": "...", "caption": "...", "columns": ["..."], "rows": [{ "cells": ["..."] }] }\n` +
    `  bullet_list: { "type": "bullet_list", "heading": "...", "items": [{ "icon": "🌍", "label": "...", "value": "...", "note": "..." }] }\n` +
    `  sources:     { "type": "sources",     "heading": "Key Data Sources", "sources": [{ "title": "...", "description": "...", "url": "..." }] }\n` +
    `  text:        { "type": "text",        "heading": "...", "body": "..." }\n\n` +
    `Rules:\n` +
    `- Extract all numbers faithfully — do not invent data\n` +
    `- Preferred section order: bar_chart → table → bullet_list(s) → sources\n` +
    `- Every table row must have exactly as many cells as there are columns\n` +
    `- If sources appear in the material, include a sources section`;

  const response = await client.messages.create({
    model:      'claude-opus-4-5',
    max_tokens: 4096,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: [...blocks, { type: 'text', text: userPrompt }] }],
  });

  const raw  = (response.content[0] as { type: string; text: string }).text.trim();
  const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  let artifact: KnowledgeSummary;
  try {
    artifact = JSON.parse(json) as KnowledgeSummary;
  } catch (e) {
    const debugFile = '/tmp/artifact-build-debug.txt';
    fs.writeFileSync(debugFile, raw);
    console.error(`✗ Claude returned invalid JSON: ${(e as Error).message}`);
    console.error(`  Raw response saved to ${debugFile}`);
    process.exit(1);
  }

  artifact.id = id; // enforce id matches

  if (!fs.existsSync(SUMMARIES_DIR)) fs.mkdirSync(SUMMARIES_DIR, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2) + '\n');
  console.log(`✓ Written: data/artifacts/${id}.json`);

  // Validate
  const result = validateArtifact(artifact, `${id}.json`);
  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log('✓ Validation passed\n');
  } else {
    if (result.errors.length)   console.log('\n⚠ Errors in generated artifact:');
    for (const e of result.errors)   console.log(`  error:   ${e}`);
    for (const w of result.warnings) console.log(`  warning: ${w}`);
    console.log('');
  }

  console.log('Next steps:');
  console.log('  1. Set summary_id in your puzzle manifest');
  console.log('  2. npm run build:puzzles');
  console.log(`  3. http://localhost:3000/creator  (check status → Ready)\n`);
}

// ── NEW command (manual/skeleton path) ────────────────────────────────────────

const SKELETON: KnowledgeSummary = {
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
      rows: [{ cells: ['', '', ''] }],
    },
    {
      type: 'bullet_list',
      heading: '',
      items: [{ icon: '🌍', label: 'Region A', value: '', note: '' }],
    },
    {
      type: 'sources',
      heading: 'Key Data Sources',
      sources: [{ title: '', description: '', url: '' }],
    },
  ],
  related_summary_ids: [],
};

async function cmdNew(id: string): Promise<void> {
  if (!id) {
    console.error('\nUsage: artifact new <id>');
    console.error('  Example: npm run summary -- new artifact_global_doctors');
    process.exit(1);
  }

  if (!/^[a-z0-9_]+$/.test(id)) {
    console.error(`\n✗ ID "${id}" must match /^[a-z0-9_]+$/ (lowercase, digits, underscores)`);
    process.exit(1);
  }

  const outPath = path.join(SUMMARIES_DIR, `${id}.json`);
  if (fs.existsSync(outPath)) {
    console.error(`\n✗ File already exists: ${outPath}`);
    process.exit(1);
  }

  // Hint about build command if a source folder exists
  const inputDir = resolveInputDir(id);
  if (inputDir) {
    console.log(`\n💡 Source folder found: ${path.relative(ROOT, inputDir)}`);
    console.log('   Consider using the build command instead of new — it generates the');
    console.log('   artifact content automatically from your screenshots:');
    console.log(`   npm run summary -- build ${id}\n`);
  }

  if (!fs.existsSync(SUMMARIES_DIR)) fs.mkdirSync(SUMMARIES_DIR, { recursive: true });

  const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> =>
    new Promise(resolve => rl.question(q, a => resolve(a.trim())));

  console.log(`\n── New Artifact (skeleton): ${id} ──`);
  console.log('Sections are pre-scaffolded — you\'ll edit the JSON file to fill them in.\n');

  const skeleton     = JSON.parse(JSON.stringify(SKELETON)) as KnowledgeSummary;
  skeleton.id        = id;
  skeleton.title     = await ask('Title (e.g. "Global Homelessness"): ');
  skeleton.description = await ask('One-line description: ');

  const domainOpts   = 'people/healthcare/education/food/water/energy/housing/transportation/money/environment/technology';
  skeleton.domain    = await ask(`Domain [${domainOpts}]: `);

  const yearRaw = await ask(`Data year [${skeleton.data_year}]: `);
  if (yearRaw && /^\d{4}$/.test(yearRaw)) skeleton.data_year = parseInt(yearRaw, 10);

  rl.close();

  fs.writeFileSync(outPath, JSON.stringify(skeleton, null, 2) + '\n');

  console.log(`\n✓ Created: ${outPath}`);
  console.log('\nNext steps:');
  console.log('  1. Open the file and fill in each section\'s content');
  console.log('  2. Delete section types you don\'t need');
  console.log('  3. npm run summary -- validate ' + id);
  console.log('  4. Set summary_id in your puzzle manifest, then: npm run build:puzzles\n');
}

// ── VALIDATE command ──────────────────────────────────────────────────────────

interface ValidationResult {
  id: string;
  file: string;
  errors: string[];
  warnings: string[];
}

function validateArtifact(a: KnowledgeSummary, file: string): ValidationResult {
  const errors: string[]   = [];
  const warnings: string[] = [];

  if (!a.id)          errors.push('missing: id');
  if (!a.title)       errors.push('missing: title');
  if (!a.description) warnings.push('empty: description');
  if (!a.domain)      errors.push('missing: domain');
  if (!a.data_year)   errors.push('missing: data_year');
  if (!a.updated_at)  warnings.push('empty: updated_at');

  const expectedId = file.replace(/\.json$/, '');
  if (a.id && a.id !== expectedId) {
    errors.push(`id "${a.id}" does not match filename "${expectedId}"`);
  }

  if (!Array.isArray(a.sections)) {
    errors.push('sections must be an array');
  } else if (a.sections.length === 0) {
    warnings.push('sections is empty — artifact has no content');
  } else {
    for (let i = 0; i < a.sections.length; i++) {
      const s      = a.sections[i];
      const prefix = `sections[${i}]`;

      if (!s.type) { errors.push(`${prefix}: missing type`); continue; }
      if (!VALID_SECTION_TYPES.includes(s.type as SectionType)) {
        errors.push(`${prefix}: unknown type "${s.type}" (valid: ${VALID_SECTION_TYPES.join(', ')})`);
        continue;
      }

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
          if (!s['heading']) warnings.push(`${prefix} (sources): missing heading`);
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

  if (!Array.isArray(a.related_summary_ids)) errors.push('related_summary_ids must be an array');

  return { id: a.id ?? file.replace(/\.json$/, ''), file, errors, warnings };
}

function cmdValidate(targetId?: string): void {
  const artifacts = targetId
    ? (() => {
        const f = `${targetId}.json`;
        const p = path.join(SUMMARIES_DIR, f);
        if (!fs.existsSync(p)) {
          console.error(`\n✗ Artifact not found: ${p}`);
          process.exit(1);
        }
        const { data, errors } = loadArtifact(p);
        return [{ file: f, id: targetId, data: errors.length ? null : data, parseError: errors[0] }];
      })()
    : listArtifacts();

  if (artifacts.length === 0) { console.log('\nNo artifacts to validate.'); return; }

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
      if (r.errors.length > 0) { hasErrors = true; console.log(`  ✗ ${r.id}`); }
      else console.log(`  ✓ ${r.id}  (with warnings)`);
      for (const e of r.errors)   console.log(`      error:   ${e}`);
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
const force = cmdArgs.includes('--force');
const positionalArgs = cmdArgs.filter(a => !a.startsWith('--'));

switch (command) {
  case 'status':
    cmdStatus();
    break;

  case 'build':
    cmdBuild(positionalArgs[0], force).catch(err => { console.error(err); process.exit(1); });
    break;

  case 'new':
    cmdNew(positionalArgs[0]).catch(err => { console.error(err); process.exit(1); });
    break;

  case 'validate':
    cmdValidate(positionalArgs[0]);
    break;

  default:
    console.log(`
artifact — Planet1000 Knowledge Artifact manager

Commands:
  build <id> [--force]   Generate artifact from source images via Claude API
  new <id>               Scaffold a blank skeleton for manual editing
  status                 List all artifacts and puzzles; show links and flags
  validate [id]          Check artifact structure; omit id to validate all

Preferred workflow (with source images):
  1. Put screenshots in  data/source/summary-input/<topic>/
  2. npm run summary -- build artifact_<topic>
  3. npm run summary -- validate artifact_<topic>
  4. Set summary_id in your puzzle manifest
  5. npm run build:puzzles

Folder naming — artifact_internet_access looks for:
  data/source/summary-input/internet-access/   (hyphens, preferred)
  data/source/summary-input/internet_access/   (underscores)
  data/source/summary-input/artifact_internet_access/

Supported source files:
  Images:  .png  .jpg  .jpeg  .webp  .gif
  Text:    .txt  .md   (additional notes / raw data)

Environment:
  ANTHROPIC_API_KEY   required for the build command

Artifact IDs use lowercase + underscores:
  artifact_global_homelessness
  artifact_people_internet
  artifact_co2_emissions

Section types:
  bar_chart     Horizontal bar chart  (heading, x_label, bars[])
  table         Data table            (columns[], rows[])
  bullet_list   Bullet points         (heading, items[])
  sources       Source list           (heading, sources[])
  text          Plain prose           (heading?, body)

Examples:
  npm run summary -- build artifact_people_internet
  npm run summary -- build artifact_people_internet --force
  npm run summary -- status
  npm run summary -- validate
  npm run summary -- validate artifact_global_homelessness
`);
    break;
}
