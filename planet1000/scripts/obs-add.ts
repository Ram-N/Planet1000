/**
 * obs-add — Interactive observation authoring script for Planet1000.
 *
 * Usage:
 *   npx tsx scripts/obs-add.ts                    (interactive)
 *   npx tsx scripts/obs-add.ts --help
 *
 * One-shot (existing entity):
 *   npx tsx scripts/obs-add.ts \
 *     --id healthcare-dentists --entity doctors \
 *     --metric population-count --value 2000000 --unit people \
 *     --source who --confidence low --notes "2 million dentists worldwide."
 *
 * One-shot (new entity):
 *   npx tsx scripts/obs-add.ts \
 *     --id people-nurses-rural --entity nurses-rural \
 *     --entity-name "Rural nurses" --entity-domain healthcare \
 *     --entity-desc "Nurses working in rural areas" \
 *     --metric population-count --value 35000000 --unit people \
 *     --source who --confidence medium --notes "About 35 million nurses..."
 *
 * Optional one-shot flags (all have defaults):
 *   --pop    all|adults|children   (default: all)
 *   --year   2023|2022             (default: 2023)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { spawnSync } from 'child_process';

// ── Paths ──────────────────────────────────────────────────────────────────────

const DATA_SRC       = path.join(__dirname, '../data/source');
const OBS_PATH       = path.join(DATA_SRC, 'observations.csv');
const ENTITIES_PATH  = path.join(DATA_SRC, 'entities.csv');
const SOURCES_PATH   = path.join(DATA_SRC, 'sources.csv');
const METRICS_PATH   = path.join(DATA_SRC, 'metrics.csv');
const UNITS_PATH     = path.join(DATA_SRC, 'units.csv');
const GEOS_PATH      = path.join(DATA_SRC, 'geographies.csv');
const PERIODS_PATH   = path.join(DATA_SRC, 'time_periods.csv');
const POPGROUPS_PATH = path.join(DATA_SRC, 'population_groups.csv');

// ── CSV parser (self-contained — duplicated from fact-hunt.ts) ─────────────────

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

// ── Types ──────────────────────────────────────────────────────────────────────

interface Lookups {
  observations: Record<string, string>[];
  entities:     Record<string, string>[];
  sources:      Record<string, string>[];
  metrics:      Record<string, string>[];
  units:        Record<string, string>[];
  geographies:  Record<string, string>[];
  timePeriods:  Record<string, string>[];
  popGroups:    Record<string, string>[];
}

interface NewEntity {
  id: string;
  name: string;
  domain: string;
  description: string;
}

interface NewSource {
  id: string;
  url: string;
  title: string;
}

interface ObsFields {
  id:           string;
  entityId:     string;
  newEntity?:   NewEntity;
  metricId:     string;
  value:        number;
  unitId:       string;
  sourceId:     string;
  newSource?:   NewSource;
  geographyId:  string;
  timePeriodId: string;
  popGroupId:   string;
  confidence:   string;
  notes:        string;
}

// ── Lookups ────────────────────────────────────────────────────────────────────

function loadLookups(): Lookups {
  return {
    observations: parseCSV(OBS_PATH),
    entities:     parseCSV(ENTITIES_PATH),
    sources:      parseCSV(SOURCES_PATH),
    metrics:      parseCSV(METRICS_PATH),
    units:        parseCSV(UNITS_PATH),
    geographies:  parseCSV(GEOS_PATH),
    timePeriods:  parseCSV(PERIODS_PATH),
    popGroups:    parseCSV(POPGROUPS_PATH),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function suggestId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const WORLD_POP = 8_200_000_000;

function per1kDisplay(value: number, metricId: string): string {
  if (
    metricId === 'percentage-share' ||
    metricId === 'per-capita-daily' ||
    metricId === 'per-capita-annual'
  ) {
    return '(rate metric — no per-1k conversion)';
  }
  return `→ ${((value / WORLD_POP) * 1000).toFixed(3)} per 1,000`;
}

function makeAsker(rl: readline.Interface): (q: string) => Promise<string> {
  return (q: string) => new Promise(resolve => rl.question(q, ans => resolve(ans.trim())));
}

// ── Validation ─────────────────────────────────────────────────────────────────

function validateAll(fields: ObsFields, lookups: Lookups): string[] {
  const errors: string[] = [];

  // 1. id format
  if (!/^[a-z0-9-]+$/.test(fields.id)) {
    errors.push(`id "${fields.id}" must match /^[a-z0-9-]+$/`);
  }

  // 2. id unique
  if (lookups.observations.some(o => o['id'] === fields.id)) {
    errors.push(`id "${fields.id}" already exists in observations.csv`);
  }

  // 3. entity exists or being created
  const entityExists = lookups.entities.some(e => e['id'] === fields.entityId);
  if (!entityExists && !fields.newEntity) {
    errors.push(`entity_id "${fields.entityId}" not found in entities.csv — provide --entity-name to create it`);
  }

  // 4. new entity id unique and valid
  if (fields.newEntity) {
    if (!/^[a-z0-9-]+$/.test(fields.newEntity.id)) {
      errors.push(`new entity id "${fields.newEntity.id}" must match /^[a-z0-9-]+$/`);
    }
    if (lookups.entities.some(e => e['id'] === fields.newEntity!.id)) {
      errors.push(`new entity id "${fields.newEntity.id}" already exists in entities.csv`);
    }
    if (!fields.newEntity.name.trim()) {
      errors.push('new entity name is required');
    }
    if (!fields.newEntity.domain.trim()) {
      errors.push('new entity domain is required');
    }
    if (!fields.newEntity.description.trim()) {
      errors.push('new entity description is required');
    }
  }

  // 5. composite key unique
  const effectiveEntityId = fields.newEntity ? fields.newEntity.id : fields.entityId;
  if (
    lookups.observations.some(o =>
      o['entity_id']         === effectiveEntityId &&
      o['metric_id']         === fields.metricId &&
      o['geography_id']      === fields.geographyId &&
      o['time_period_id']    === fields.timePeriodId &&
      o['population_group_id'] === fields.popGroupId
    )
  ) {
    errors.push(
      `Duplicate composite key: entity=${effectiveEntityId}, metric=${fields.metricId}, ` +
      `geo=${fields.geographyId}, period=${fields.timePeriodId}, pop=${fields.popGroupId}`
    );
  }

  // 6. metric_id valid
  if (!lookups.metrics.some(m => m['id'] === fields.metricId)) {
    errors.push(`metric_id "${fields.metricId}" not found in metrics.csv`);
  }

  // 7. unit_id valid
  if (!lookups.units.some(u => u['id'] === fields.unitId)) {
    errors.push(`unit_id "${fields.unitId}" not found in units.csv`);
  }

  // 8. source exists or being created
  const sourceExists = lookups.sources.some(s => s['id'] === fields.sourceId);
  if (!sourceExists && !fields.newSource) {
    errors.push(`source_id "${fields.sourceId}" not found in sources.csv — provide --source-url and --source-title to create it`);
  }

  // 9. new source id unique
  if (fields.newSource) {
    if (lookups.sources.some(s => s['id'] === fields.newSource!.id)) {
      errors.push(`new source id "${fields.newSource.id}" already exists in sources.csv`);
    }
    if (!fields.newSource.url.trim()) {
      errors.push('new source URL is required');
    }
    if (!fields.newSource.title.trim()) {
      errors.push('new source title is required');
    }
  }

  // 10. confidence valid
  if (!['high', 'medium', 'low'].includes(fields.confidence)) {
    errors.push(`confidence "${fields.confidence}" must be high, medium, or low`);
  }

  // 11. value valid
  if (!isFinite(fields.value) || fields.value <= 0) {
    errors.push(`value must be a finite positive number (got ${fields.value})`);
  }

  // 12. notes non-empty
  if (!fields.notes.trim()) {
    errors.push('notes is required');
  }

  return errors;
}

// ── Write helpers ──────────────────────────────────────────────────────────────

function appendEntityRow(entity: NewEntity): void {
  const row = [entity.id, entity.name, entity.domain, entity.description]
    .map(csvEscape)
    .join(',');
  fs.appendFileSync(ENTITIES_PATH, row + '\n');
}

function appendSourceRow(source: NewSource, today: string): void {
  const row = [source.id, source.url, source.title, today, today]
    .map(csvEscape)
    .join(',');
  fs.appendFileSync(SOURCES_PATH, row + '\n');
}

function appendObservationRow(fields: ObsFields): void {
  const effectiveEntityId = fields.newEntity ? fields.newEntity.id : fields.entityId;
  const row = [
    fields.id,
    effectiveEntityId,
    fields.metricId,
    fields.geographyId,
    fields.timePeriodId,
    fields.popGroupId,
    String(fields.value),
    fields.unitId,
    fields.sourceId,
    fields.confidence,
    fields.notes,
  ].map(csvEscape).join(',');
  fs.appendFileSync(OBS_PATH, row + '\n');
}

function writeAll(fields: ObsFields, today: string): void {
  if (fields.newSource) appendSourceRow(fields.newSource, today);
  if (fields.newEntity) appendEntityRow(fields.newEntity);
  appendObservationRow(fields);
}

// ── Preview ────────────────────────────────────────────────────────────────────

function showPreview(fields: ObsFields, lookups: Lookups): void {
  const effectiveEntityId = fields.newEntity ? fields.newEntity.id : fields.entityId;

  const entityRow = fields.newEntity
    ? { name: fields.newEntity.name, domain: fields.newEntity.domain }
    : (lookups.entities.find(e => e['id'] === fields.entityId) ?? { name: '?', domain: '?' });

  const metricRow  = lookups.metrics.find(m => m['id'] === fields.metricId) ?? { name: '?' };
  const unitRow    = lookups.units.find(u => u['id'] === fields.unitId)     ?? { name: '?' };
  const sourceRow  = fields.newSource
    ? { title: fields.newSource.title }
    : (lookups.sources.find(s => s['id'] === fields.sourceId) ?? { title: '?' });

  console.log('\n── Preview ──────────────────────────────────────────────\n');
  console.log(`Observation ID: ${fields.id}`);
  console.log(`Entity:         ${effectiveEntityId} — "${entityRow.name}" (${entityRow.domain})${fields.newEntity ? '  ← NEW' : ''}`);
  console.log(`Metric:         ${fields.metricId}  (${metricRow.name})`);
  console.log(`Value:          ${fields.value.toLocaleString()}  (${per1kDisplay(fields.value, fields.metricId)})`);
  console.log(`Unit:           ${fields.unitId}  (${unitRow.name})`);
  console.log(`Source:         ${fields.sourceId}  — ${sourceRow.title}${fields.newSource ? '  ← NEW' : ''}`);
  console.log(`Population:     ${fields.popGroupId}  |  Period: ${fields.timePeriodId}  |  Confidence: ${fields.confidence}`);
  console.log(`Notes:          ${fields.notes}`);
}

// ── Build runner ───────────────────────────────────────────────────────────────

function runBuild(): void {
  const projectRoot = path.join(__dirname, '..');
  console.log('\nRunning npm run build:data...\n');
  const result = spawnSync('npm', ['run', 'build:data'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    console.error(`\n✗ build:data exited with code ${result.status}`);
  }
}

// ── Interactive mode ───────────────────────────────────────────────────────────

async function cmdAddInteractive(lookups: Lookups): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = makeAsker(rl);
  const today = new Date().toISOString().slice(0, 10);

  console.log('\n── Add Observation ──────────────────────────────────────\n');

  // ── Observation ID ──────────────────────────────────────────────────────────
  let obsId = '';
  while (true) {
    obsId = await ask('Observation ID (e.g. people-nurses-rural): ');
    const idErrors: string[] = [];
    if (!obsId) { console.log('  ✗ ID is required'); continue; }
    if (!/^[a-z0-9-]+$/.test(obsId)) idErrors.push('must match /^[a-z0-9-]+$/');
    if (lookups.observations.some(o => o['id'] === obsId)) idErrors.push('already exists in observations.csv');
    if (idErrors.length === 0) break;
    console.log(`  ✗ ${idErrors.join(', ')}`);
  }

  // ── Entity ──────────────────────────────────────────────────────────────────
  let entityId = '';
  let newEntity: NewEntity | undefined;

  console.log('\nEntity:');
  lookups.entities.forEach((e, i) => {
    console.log(`  [${String(i + 1).padStart(2)}] ${e['id'].padEnd(32)} ${e['name']} (${e['domain']})`);
  });
  console.log('  [ N] Create new entity');

  while (true) {
    const choice = await ask('Choose: ');
    if (choice.toLowerCase() === 'n') {
      const entName   = await ask('  Name: ');
      const domainOpts = 'people/healthcare/education/food/water/energy/housing/transportation/money/environment';
      const entDomain = await ask(`  Domain [${domainOpts}]: `);
      const entDesc   = await ask('  Description: ');
      const suggested = suggestId(entName);
      const entIdRaw  = await ask(`  Entity ID [${suggested}]: `);
      const entId     = entIdRaw || suggested;
      newEntity = { id: entId, name: entName, domain: entDomain, description: entDesc };
      entityId  = entId;
      break;
    }
    const num = parseInt(choice, 10);
    if (num >= 1 && num <= lookups.entities.length) {
      entityId = lookups.entities[num - 1]['id'];
      break;
    }
    console.log(`  ✗ Enter a number 1-${lookups.entities.length} or N`);
  }

  // ── Metric ──────────────────────────────────────────────────────────────────
  let metricId = '';
  console.log('\nMetric:');
  lookups.metrics.forEach((m, i) => {
    console.log(`  [${i + 1}] ${m['id'].padEnd(22)} ${m['name']}`);
  });
  while (true) {
    const choice = await ask(`Choose [1-${lookups.metrics.length}]: `);
    const num = parseInt(choice, 10);
    if (num >= 1 && num <= lookups.metrics.length) {
      metricId = lookups.metrics[num - 1]['id'];
      break;
    }
    console.log(`  ✗ Enter a number 1-${lookups.metrics.length}`);
  }

  // ── Value ───────────────────────────────────────────────────────────────────
  let value = 0;
  while (true) {
    const raw = await ask('Value (raw number): ');
    const parsed = parseFloat(raw.replace(/,/g, ''));
    if (isFinite(parsed) && parsed > 0) {
      value = parsed;
      console.log(`  ${per1kDisplay(value, metricId)}`);
      break;
    }
    console.log('  ✗ Enter a positive number');
  }

  // ── Unit ────────────────────────────────────────────────────────────────────
  let unitId = '';
  console.log('\nUnit:');
  lookups.units.forEach((u, i) => {
    const label = `[${i + 1}] ${u['id']}`;
    process.stdout.write(`  ${label.padEnd(28)}`);
    if ((i + 1) % 3 === 0) process.stdout.write('\n');
  });
  if (lookups.units.length % 3 !== 0) process.stdout.write('\n');
  while (true) {
    const choice = await ask(`Choose [1-${lookups.units.length}]: `);
    const num = parseInt(choice, 10);
    if (num >= 1 && num <= lookups.units.length) {
      unitId = lookups.units[num - 1]['id'];
      break;
    }
    console.log(`  ✗ Enter a number 1-${lookups.units.length}`);
  }

  // ── Source ──────────────────────────────────────────────────────────────────
  let sourceId = '';
  let newSource: NewSource | undefined;

  console.log('\nSource:');
  lookups.sources.forEach((s, i) => {
    console.log(`  [${i + 1}] ${s['id'].padEnd(15)} ${s['title']}`);
  });
  const addNewIdx = lookups.sources.length + 1;
  console.log(`  [${addNewIdx}] Add new source...`);

  while (true) {
    const choice = await ask('Choose: ');
    const num = parseInt(choice, 10);
    if (num === addNewIdx) {
      const srcId    = await ask('  Source ID (e.g. unicef): ');
      const srcUrl   = await ask('  URL: ');
      const srcTitle = await ask('  Title: ');
      newSource = { id: srcId, url: srcUrl, title: srcTitle };
      sourceId  = srcId;
      break;
    }
    if (num >= 1 && num <= lookups.sources.length) {
      sourceId = lookups.sources[num - 1]['id'];
      break;
    }
    console.log(`  ✗ Enter a number 1-${addNewIdx}`);
  }

  // ── Population group ────────────────────────────────────────────────────────
  const popInput   = await ask('\nPopulation group [all/adults/children] (default all): ');
  const popGroupId = ['all', 'adults', 'children'].includes(popInput) ? popInput : 'all';
  if (!popInput || popInput === 'all') console.log('  → all');

  // ── Time period ─────────────────────────────────────────────────────────────
  const yearInput    = await ask('Time period [2023/2022] (default 2023): ');
  const timePeriodId = yearInput === '2022' ? '2022' : '2023';
  if (!yearInput || yearInput === '2023') console.log('  → 2023');

  // ── Confidence ──────────────────────────────────────────────────────────────
  let confidence = '';
  while (true) {
    const c = await ask('Confidence [high/medium/low]: ');
    if (['high', 'medium', 'low'].includes(c)) { confidence = c; break; }
    console.log('  ✗ Enter high, medium, or low');
  }

  // ── Notes ───────────────────────────────────────────────────────────────────
  let notes = '';
  while (true) {
    notes = await ask('Notes (shown in game UI): ');
    if (notes.trim()) break;
    console.log('  ✗ Notes are required');
  }

  // ── Validate & preview ──────────────────────────────────────────────────────
  const fields: ObsFields = {
    id: obsId, entityId, newEntity,
    metricId, value, unitId,
    sourceId, newSource,
    geographyId: 'world', timePeriodId, popGroupId,
    confidence, notes,
  };

  const errors = validateAll(fields, lookups);
  if (errors.length > 0) {
    console.log('\n✗ Validation errors:');
    for (const e of errors) console.log(`  • ${e}`);
    rl.close();
    process.exit(1);
  }

  showPreview(fields, lookups);

  console.log('\nWrites to:');
  if (newSource) console.log('  data/source/sources.csv         ← new source');
  if (newEntity) console.log('  data/source/entities.csv        ← new entity');
  console.log('  data/source/observations.csv');

  const confirm = await ask('\nAdd? [Y/n]: ');
  if (confirm.toLowerCase().startsWith('n')) {
    console.log('Aborted.');
    rl.close();
    return;
  }

  writeAll(fields, today);
  console.log('\n✓ Written.');

  const rebuild = await ask('Run npm run build:data now? [Y/n]: ');
  rl.close();
  if (!rebuild.toLowerCase().startsWith('n')) {
    runBuild();
  }
}

// ── One-shot mode ──────────────────────────────────────────────────────────────

interface Flags {
  id?:           string;
  entity?:       string;
  entityName?:   string;
  entityDomain?: string;
  entityDesc?:   string;
  metric?:       string;
  value?:        string;
  unit?:         string;
  source?:       string;
  sourceUrl?:    string;
  sourceTitle?:  string;
  confidence?:   string;
  notes?:        string;
  pop?:          string;
  year?:         string;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg  = argv[i];
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) continue;
    if (arg === '--id')            { flags.id           = next; i++; }
    if (arg === '--entity')        { flags.entity       = next; i++; }
    if (arg === '--entity-name')   { flags.entityName   = next; i++; }
    if (arg === '--entity-domain') { flags.entityDomain = next; i++; }
    if (arg === '--entity-desc')   { flags.entityDesc   = next; i++; }
    if (arg === '--metric')        { flags.metric       = next; i++; }
    if (arg === '--value')         { flags.value        = next; i++; }
    if (arg === '--unit')          { flags.unit         = next; i++; }
    if (arg === '--source')        { flags.source       = next; i++; }
    if (arg === '--source-url')    { flags.sourceUrl    = next; i++; }
    if (arg === '--source-title')  { flags.sourceTitle  = next; i++; }
    if (arg === '--confidence')    { flags.confidence   = next; i++; }
    if (arg === '--notes')         { flags.notes        = next; i++; }
    if (arg === '--pop')           { flags.pop          = next; i++; }
    if (arg === '--year')          { flags.year         = next; i++; }
  }
  return flags;
}

const ONE_SHOT_REQUIRED = ['id', 'entity', 'metric', 'value', 'unit', 'source', 'confidence', 'notes'] as const;

function isOneShotMode(flags: Flags): boolean {
  return ONE_SHOT_REQUIRED.every(k => !!flags[k as keyof Flags]);
}

async function cmdAddOneShot(flags: Flags, lookups: Lookups): Promise<void> {
  const today    = new Date().toISOString().slice(0, 10);
  const rawValue = parseFloat((flags.value ?? '').replace(/,/g, ''));

  // Determine entity
  const entityExists = lookups.entities.some(e => e['id'] === flags.entity);
  let newEntity: NewEntity | undefined;
  if (!entityExists) {
    if (!flags.entityName) {
      console.error(`\n✗ Entity "${flags.entity}" not found. Provide --entity-name to create it.`);
      process.exit(1);
    }
    newEntity = {
      id:          flags.entity!,
      name:        flags.entityName!,
      domain:      flags.entityDomain ?? '',
      description: flags.entityDesc   ?? '',
    };
  }

  // Determine source
  const sourceExists = lookups.sources.some(s => s['id'] === flags.source);
  let newSource: NewSource | undefined;
  if (!sourceExists) {
    if (!flags.sourceUrl || !flags.sourceTitle) {
      console.error(`\n✗ Source "${flags.source}" not found. Provide --source-url and --source-title to create it.`);
      process.exit(1);
    }
    newSource = {
      id:    flags.source!,
      url:   flags.sourceUrl!,
      title: flags.sourceTitle!,
    };
  }

  const popGroupId   = flags.pop && ['all', 'adults', 'children'].includes(flags.pop) ? flags.pop : 'all';
  const timePeriodId = flags.year === '2022' ? '2022' : '2023';

  const fields: ObsFields = {
    id:          flags.id!,
    entityId:    flags.entity!,
    newEntity,
    metricId:    flags.metric!,
    value:       rawValue,
    unitId:      flags.unit!,
    sourceId:    flags.source!,
    newSource,
    geographyId: 'world',
    timePeriodId,
    popGroupId,
    confidence:  flags.confidence!,
    notes:       flags.notes!,
  };

  const errors = validateAll(fields, lookups);
  if (errors.length > 0) {
    console.log('\n✗ Validation errors:');
    for (const e of errors) console.log(`  • ${e}`);
    process.exit(1);
  }

  showPreview(fields, lookups);

  console.log('\nWrites to:');
  if (newSource) console.log('  data/source/sources.csv         ← new source');
  if (newEntity) console.log('  data/source/entities.csv        ← new entity');
  console.log('  data/source/observations.csv');

  const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = makeAsker(rl);

  const confirm = await ask('\nAdd? [Y/n]: ');
  if (confirm.toLowerCase().startsWith('n')) {
    console.log('Aborted.');
    rl.close();
    return;
  }

  writeAll(fields, today);
  console.log('\n✓ Written.');

  const rebuild = await ask('Run npm run build:data now? [Y/n]: ');
  rl.close();
  if (!rebuild.toLowerCase().startsWith('n')) {
    runBuild();
  }
}

// ── Help ───────────────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
obs-add — Interactively add a new Planet1000 observation

Interactive (no flags):
  npx tsx scripts/obs-add.ts

One-shot (existing entity):
  npx tsx scripts/obs-add.ts \\
    --id healthcare-dentists --entity doctors \\
    --metric population-count --value 2000000 --unit people \\
    --source who --confidence low --notes "2 million dentists worldwide."

One-shot (new entity):
  npx tsx scripts/obs-add.ts \\
    --id people-nurses-rural --entity nurses-rural \\
    --entity-name "Rural nurses" --entity-domain healthcare \\
    --entity-desc "Nurses working in rural areas" \\
    --metric population-count --value 35000000 --unit people \\
    --source who --confidence medium --notes "About 35 million nurses..."

Optional one-shot flags (defaults shown):
  --pop    all|adults|children   (default: all)
  --year   2023|2022             (default: 2023)

New source flags (when --source value is not in sources.csv):
  --source-url   <url>
  --source-title <title>
  (dates auto-filled to today)
`);
}

// ── Entry point ────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);

if (argv.includes('--help') || argv.includes('-h')) {
  printHelp();
  process.exit(0);
}

const lookups = loadLookups();
const flags   = parseFlags(argv);

if (isOneShotMode(flags)) {
  cmdAddOneShot(flags, lookups).catch(err => { console.error(err); process.exit(1); });
} else if (argv.length > 0) {
  // Partial flags provided — tell user what's missing
  const missing = ONE_SHOT_REQUIRED.filter(k => !flags[k as keyof Flags]);
  if (missing.length > 0 && missing.length < ONE_SHOT_REQUIRED.length) {
    console.error(`\n✗ One-shot mode requires: ${ONE_SHOT_REQUIRED.map(r => '--' + r).join(' ')}`);
    console.error(`  Missing: ${missing.map(r => '--' + r).join(', ')}`);
    console.error('  Run without flags for interactive mode, or --help for usage.');
    process.exit(1);
  }
  // Unknown/irrelevant flags — fall through to interactive
  cmdAddInteractive(lookups).catch(err => { console.error(err); process.exit(1); });
} else {
  cmdAddInteractive(lookups).catch(err => { console.error(err); process.exit(1); });
}
