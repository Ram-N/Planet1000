/**
 * Build pipeline: CSV source files → generated/world-model.json
 *
 * Run with: npm run build:data
 */

import fs from 'fs';
import path from 'path';
import { runAllValidations, type ParsedData } from './validate';

const SOURCE_DIR = path.join(__dirname, '../data/source');
const OUTPUT_FILE = path.join(__dirname, '../data/generated/world-model.json');

// Ordered priority for fact types when selecting hints
const FACT_TYPE_ORDER = ['scale_anchor', 'geographic', 'inequality', 'comparison', 'trend', 'general'];

const WORLD_POPULATION = 10_000_000_000;

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------

function parseCSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim() !== '');
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

/** Parse a single CSV line, handling quoted fields with commas inside. */
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

// ---------------------------------------------------------------------------
// Load all CSVs
// ---------------------------------------------------------------------------

interface FactRow { id: string; observation_id: string; type: string; text: string; }

function loadFacts(): Map<string, string[]> {
  const factsPath = path.join(SOURCE_DIR, 'facts.csv');
  if (!fs.existsSync(factsPath)) return new Map();

  const rows = parseCSV(factsPath) as unknown as FactRow[];

  // Group by observation_id, preserving order defined by FACT_TYPE_ORDER
  const grouped = new Map<string, FactRow[]>();
  for (const row of rows) {
    const obsId = row.observation_id?.trim();
    if (!obsId) continue;
    if (!grouped.has(obsId)) grouped.set(obsId, []);
    grouped.get(obsId)!.push(row);
  }

  // Sort each group by fact type priority, then return just the text strings
  const result = new Map<string, string[]>();
  for (const [obsId, facts] of grouped) {
    const sorted = facts.slice().sort((a, b) => {
      const ai = FACT_TYPE_ORDER.indexOf(a.type ?? '');
      const bi = FACT_TYPE_ORDER.indexOf(b.type ?? '');
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    result.set(obsId, sorted.map((f) => f.text));
  }
  return result;
}

function loadData(): ParsedData {
  const load = (file: string) => parseCSV(path.join(SOURCE_DIR, file));
  return {
    entities: load('entities.csv') as Record<string, unknown>[],
    metrics: load('metrics.csv') as Record<string, unknown>[],
    geographies: load('geographies.csv') as Record<string, unknown>[],
    time_periods: load('time_periods.csv') as Record<string, unknown>[],
    population_groups: load('population_groups.csv') as Record<string, unknown>[],
    units: load('units.csv') as Record<string, unknown>[],
    sources: load('sources.csv') as Record<string, unknown>[],
    observations: load('observations.csv') as Record<string, unknown>[],
  };
}

// ---------------------------------------------------------------------------
// Build typed WorldModel JSON
// ---------------------------------------------------------------------------

interface Entity { id: string; name: string; domain: string; description: string; }
interface Metric { id: string; name: string; measure_type: string; default_unit: string; description: string; }
interface Geography { id: string; name: string; level: string; parent_id: string | null; }
interface TimePeriod { id: string; type: string; start_date: string; end_date: string; }
interface PopulationGroup { id: string; name: string; description: string; }
interface Unit { id: string; name: string; symbol: string; conversion_factor_to_base: number; }
interface Source { id: string; url: string; title: string; publication_date: string; retrieval_date: string; }
interface Observation {
  id: string; entity_id: string; metric_id: string; geography_id: string;
  time_period_id: string; population_group_id: string; value: number;
  unit_id: string; source_id: string; confidence: string; notes: string;
  entity: Entity; metric: Metric; unit: Unit; facts: string[];
}

function buildWorldModel(data: ParsedData, factsMap: Map<string, string[]>) {
  const entities = data.entities.map((r) => ({
    id: String(r.id), name: String(r.name), domain: String(r.domain), description: String(r.description),
  })) as Entity[];

  const metrics = data.metrics.map((r) => ({
    id: String(r.id), name: String(r.name), measure_type: String(r.measure_type),
    default_unit: String(r.default_unit), description: String(r.description),
  })) as Metric[];

  const geographies = data.geographies.map((r) => ({
    id: String(r.id), name: String(r.name), level: String(r.level),
    parent_id: r.parent_id ? String(r.parent_id) : null,
  })) as Geography[];

  const timePeriods = data.time_periods.map((r) => ({
    id: String(r.id), type: String(r.type), start_date: String(r.start_date), end_date: String(r.end_date),
  })) as TimePeriod[];

  const populationGroups = data.population_groups.map((r) => ({
    id: String(r.id), name: String(r.name), description: String(r.description),
  })) as PopulationGroup[];

  const units = data.units.map((r) => ({
    id: String(r.id), name: String(r.name), symbol: String(r.symbol),
    conversion_factor_to_base: parseFloat(String(r.conversion_factor_to_base)),
  })) as Unit[];

  const sources = data.sources.map((r) => ({
    id: String(r.id), url: String(r.url), title: String(r.title),
    publication_date: String(r.publication_date), retrieval_date: String(r.retrieval_date),
  })) as Source[];

  // Build lookup maps for denormalization
  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const metricMap = new Map(metrics.map((m) => [m.id, m]));
  const unitMap = new Map(units.map((u) => [u.id, u]));

  const observations = data.observations.map((r) => {
    const entity = entityMap.get(String(r.entity_id));
    const metric = metricMap.get(String(r.metric_id));
    const unit = unitMap.get(String(r.unit_id));

    if (!entity || !metric || !unit) {
      throw new Error(`Missing reference for observation "${r.id}"`);
    }

    const obsId = String(r.id);
    return {
      id: obsId,
      entity_id: String(r.entity_id),
      metric_id: String(r.metric_id),
      geography_id: String(r.geography_id),
      time_period_id: String(r.time_period_id),
      population_group_id: String(r.population_group_id),
      value: parseFloat(String(r.value)),
      unit_id: String(r.unit_id),
      source_id: String(r.source_id),
      confidence: String(r.confidence),
      notes: String(r.notes),
      entity,
      metric,
      unit,
      facts: factsMap.get(obsId) ?? [],
    } as Observation;
  });

  return {
    entities,
    metrics,
    geographies,
    time_periods: timePeriods,
    population_groups: populationGroups,
    units,
    sources,
    observations,
    world_population: WORLD_POPULATION,
    generated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('🌍 Building World Model...\n');

  // Load CSVs
  console.log('📂 Loading CSV files...');
  const data = loadData();
  console.log(`   Loaded: ${data.entities.length} entities, ${data.metrics.length} metrics, ${data.observations.length} observations\n`);

  // Load facts
  console.log('📝 Loading facts.csv...');
  const factsMap = loadFacts();
  const totalFacts = Array.from(factsMap.values()).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`   Loaded: ${totalFacts} facts for ${factsMap.size} observations\n`);

  // Validate
  console.log('🔍 Validating data...');
  const errors = runAllValidations(data);
  if (errors.length > 0) {
    console.error('❌ Validation errors found:\n');
    errors.forEach((e) => console.error(`   [${e.type}] ${e.message}`));
    process.exit(1);
  }
  console.log('   ✅ All validations passed\n');

  // Build output
  console.log('🔨 Building world-model.json...');
  const worldModel = buildWorldModel(data, factsMap);

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(worldModel, null, 2));
  console.log(`   ✅ Written to ${path.relative(process.cwd(), OUTPUT_FILE)}`);
  console.log(`   📊 ${worldModel.observations.length} observations ready\n`);
  console.log('✅ World Model build complete!');
}

main();
