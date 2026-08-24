/**
 * Validation functions for the World Model data pipeline.
 * Checks referential integrity, required columns, and duplicates.
 */

export interface ValidationError {
  type: 'missing_column' | 'missing_ref' | 'duplicate' | 'invalid_value';
  file: string;
  row?: number;
  field?: string;
  message: string;
}

export interface ParsedData {
  entities: Record<string, unknown>[];
  metrics: Record<string, unknown>[];
  geographies: Record<string, unknown>[];
  time_periods: Record<string, unknown>[];
  population_groups: Record<string, unknown>[];
  units: Record<string, unknown>[];
  sources: Record<string, unknown>[];
  observations: Record<string, unknown>[];
}

const REQUIRED_COLUMNS: Record<keyof ParsedData, string[]> = {
  entities: ['id', 'name', 'domain', 'description'],
  metrics: ['id', 'name', 'measure_type', 'default_unit', 'description'],
  geographies: ['id', 'name', 'level'],
  time_periods: ['id', 'type', 'start_date', 'end_date'],
  population_groups: ['id', 'name', 'description'],
  units: ['id', 'name', 'symbol', 'conversion_factor_to_base'],
  sources: ['id', 'url', 'title', 'publication_date', 'retrieval_date'],
  observations: [
    'id', 'entity_id', 'metric_id', 'geography_id', 'time_period_id',
    'population_group_id', 'value', 'unit_id', 'source_id', 'confidence', 'notes',
  ],
};

const VALID_MEASURE_TYPES = new Set(['stock', 'flow', 'rate', 'share', 'capacity']);
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);
const VALID_GEOGRAPHY_LEVELS = new Set(['world', 'continent', 'country', 'state', 'city']);
const VALID_TIME_PERIOD_TYPES = new Set(['year', 'quarter', 'month']);

export function validateSchema(data: ParsedData): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [table, requiredCols] of Object.entries(REQUIRED_COLUMNS)) {
    const rows = data[table as keyof ParsedData];
    if (rows.length === 0) continue;
    const firstRow = rows[0];
    for (const col of requiredCols) {
      if (!(col in firstRow)) {
        errors.push({
          type: 'missing_column',
          file: `${table}.csv`,
          field: col,
          message: `Missing required column "${col}" in ${table}.csv`,
        });
      }
    }
  }

  return errors;
}

export function validateReferentialIntegrity(data: ParsedData): ValidationError[] {
  const errors: ValidationError[] = [];

  const entityIds = new Set(data.entities.map((r) => r.id as string));
  const metricIds = new Set(data.metrics.map((r) => r.id as string));
  const geographyIds = new Set(data.geographies.map((r) => r.id as string));
  const timePeriodIds = new Set(data.time_periods.map((r) => r.id as string));
  const populationGroupIds = new Set(data.population_groups.map((r) => r.id as string));
  const unitIds = new Set(data.units.map((r) => r.id as string));
  const sourceIds = new Set(data.sources.map((r) => r.id as string));

  data.observations.forEach((obs, i) => {
    const row = i + 2; // 1-indexed + header
    const check = (field: string, id: string, validSet: Set<string>) => {
      if (id && !validSet.has(id)) {
        errors.push({
          type: 'missing_ref',
          file: 'observations.csv',
          row,
          field,
          message: `Row ${row}: ${field} "${id}" not found in lookup table`,
        });
      }
    };

    check('entity_id', obs.entity_id as string, entityIds);
    check('metric_id', obs.metric_id as string, metricIds);
    check('geography_id', obs.geography_id as string, geographyIds);
    check('time_period_id', obs.time_period_id as string, timePeriodIds);
    check('population_group_id', obs.population_group_id as string, populationGroupIds);
    check('unit_id', obs.unit_id as string, unitIds);
    check('source_id', obs.source_id as string, sourceIds);

    if (!VALID_CONFIDENCE.has(obs.confidence as string)) {
      errors.push({
        type: 'invalid_value',
        file: 'observations.csv',
        row,
        field: 'confidence',
        message: `Row ${row}: confidence "${obs.confidence}" must be high|medium|low`,
      });
    }
  });

  data.metrics.forEach((m, i) => {
    if (!VALID_MEASURE_TYPES.has(m.measure_type as string)) {
      errors.push({
        type: 'invalid_value',
        file: 'metrics.csv',
        row: i + 2,
        field: 'measure_type',
        message: `Row ${i + 2}: measure_type "${m.measure_type}" must be stock|flow|rate|share|capacity`,
      });
    }
  });

  data.geographies.forEach((g, i) => {
    if (!VALID_GEOGRAPHY_LEVELS.has(g.level as string)) {
      errors.push({
        type: 'invalid_value',
        file: 'geographies.csv',
        row: i + 2,
        field: 'level',
        message: `Row ${i + 2}: level "${g.level}" must be world|continent|country|state|city`,
      });
    }
  });

  data.time_periods.forEach((tp, i) => {
    if (!VALID_TIME_PERIOD_TYPES.has(tp.type as string)) {
      errors.push({
        type: 'invalid_value',
        file: 'time_periods.csv',
        row: i + 2,
        field: 'type',
        message: `Row ${i + 2}: type "${tp.type}" must be year|quarter|month`,
      });
    }
  });

  return errors;
}

export function validateDuplicates(data: ParsedData): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for duplicate observation IDs
  const obsIds = data.observations.map((o) => o.id as string);
  const seenIds = new Set<string>();
  obsIds.forEach((id, i) => {
    if (seenIds.has(id)) {
      errors.push({
        type: 'duplicate',
        file: 'observations.csv',
        row: i + 2,
        field: 'id',
        message: `Duplicate observation id "${id}" at row ${i + 2}`,
      });
    }
    seenIds.add(id);
  });

  // Check for duplicate (entity, metric, geography, time_period, population_group) combos
  const compositeKeys = new Set<string>();
  data.observations.forEach((obs, i) => {
    const key = [
      obs.entity_id, obs.metric_id, obs.geography_id,
      obs.time_period_id, obs.population_group_id,
    ].join('|');
    if (compositeKeys.has(key)) {
      errors.push({
        type: 'duplicate',
        file: 'observations.csv',
        row: i + 2,
        message: `Duplicate composite key (entity,metric,geography,time,population_group) at row ${i + 2}: "${key}"`,
      });
    }
    compositeKeys.add(key);
  });

  return errors;
}

export function runAllValidations(data: ParsedData): ValidationError[] {
  return [
    ...validateSchema(data),
    ...validateReferentialIntegrity(data),
    ...validateDuplicates(data),
  ];
}
