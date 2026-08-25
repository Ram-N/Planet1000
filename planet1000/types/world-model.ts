export type MeasureType = 'stock' | 'flow' | 'rate' | 'share' | 'capacity';
export type GeographyLevel = 'world' | 'continent' | 'country' | 'state' | 'city';
export type TimePeriodType = 'year' | 'quarter' | 'month';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Hint 1 facts show relationships/comparisons (no world totals). Hint 2 facts show a partial anchor number for one region/group. */
export type FactType = 'relationship' | 'anchor';

export interface Fact {
  text: string;
  type: FactType;
  /** URL of the source document for this fact (from canonical-facts.csv column 4) */
  source?: string;
  /** Publication year of the source */
  year?: number;
}

export interface Entity {
  id: string;
  name: string;
  domain: string;
  description: string;
}

export interface Metric {
  id: string;
  name: string;
  measure_type: MeasureType;
  default_unit: string;
  description: string;
}

export interface Geography {
  id: string;
  name: string;
  level: GeographyLevel;
  parent_id: string | null;
}

export interface TimePeriod {
  id: string;
  type: TimePeriodType;
  start_date: string;
  end_date: string;
}

export interface PopulationGroup {
  id: string;
  name: string;
  description: string;
}

export interface Unit {
  id: string;
  name: string;
  symbol: string;
  conversion_factor_to_base: number;
}

export interface Source {
  id: string;
  url: string;
  title: string;
  publication_date: string;
  retrieval_date: string;
}

export interface SummaryRow {
  region: string;
  estimate: string;
  per_1k: number;
  drivers: string;
}

export interface ObservationSummary {
  observation_id: string;
  source_label: string;
  source_url: string;
  rows: SummaryRow[];
}

export interface Observation {
  id: string;
  entity_id: string;
  metric_id: string;
  geography_id: string;
  time_period_id: string;
  population_group_id: string;
  /** Raw world value. For stock/flow: world total. For rate/share: per-person or fractional value. */
  value: number;
  unit_id: string;
  source_id: string;
  confidence: ConfidenceLevel;
  /** Explanation text shown after answer reveal */
  notes: string;
  // Denormalized for query convenience
  entity: Entity;
  metric: Metric;
  unit: Unit;
  /** Curated facts for hint selection. relationship facts → Hint 1 (no world totals). anchor facts → Hint 2 (partial regional number). */
  facts: Fact[];
  /** Optional per-continent breakdown, populated from summaries.json when available */
  summary?: ObservationSummary;
}

export interface ScaleArgs {
  value: number;
  source_population: number;
  target_population: number;
}

export interface DerivedValue {
  raw: number;
  per_person: number;
  per_1k: number;
  as_percentage: number;
}

export interface ObservationQuery {
  id?: string;
  entity_id?: string;
  metric_id?: string;
  geography_id?: string;
  time_period_id?: string;
  population_group_id?: string;
  domain?: string;
}

export interface WorldModel {
  getObservation(query: ObservationQuery): Observation | null;
  queryObservations(filter: ObservationQuery): Observation[];
  scale(args: ScaleArgs): number;
  derive(obs: Observation): DerivedValue;
  getWorldPopulation(): number;
  /** Return the value scaled to a 1,000-person world.
   *  For stock/flow: value / world_pop * 1000
   *  For rate/share: value (already per-person or fractional)
   */
  per1k(obs: Observation): number;
  /** Look up a source by its id (e.g. 'world-bank'). Returns null if not found. */
  getSourceById(id: string): Source | null;
}

export interface WorldModelData {
  entities: Entity[];
  metrics: Metric[];
  geographies: Geography[];
  time_periods: TimePeriod[];
  population_groups: PopulationGroup[];
  units: Unit[];
  sources: Source[];
  observations: Observation[];
  world_population: number;
  generated_at: string;
}
