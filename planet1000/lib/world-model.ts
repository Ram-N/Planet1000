import type {
  Observation, ObservationQuery, ScaleArgs, DerivedValue, WorldModel, Source,
} from '@/types/world-model';

const SCALABLE_MEASURE_TYPES = new Set(['stock', 'flow']);

export class WorldModelImpl implements WorldModel {
  private readonly observations: Observation[];
  private readonly worldPopulation: number;
  private readonly sourcesMap: Map<string, Source>;

  constructor(observations: Observation[], worldPopulation: number, sources: Source[] = []) {
    this.observations = observations;
    this.worldPopulation = worldPopulation;
    this.sourcesMap = new Map(sources.map((s) => [s.id, s]));
  }

  getWorldPopulation(): number {
    return this.worldPopulation;
  }

  /**
   * Scale a value from one population size to another.
   * e.g. scale({ value: 2.57B, source_population: 10B, target_population: 1000 }) → 257
   */
  scale({ value, source_population, target_population }: ScaleArgs): number {
    if (source_population === 0) return 0;
    return (value / source_population) * target_population;
  }

  /**
   * Return the value scaled to a 1,000-person world.
   *
   * For stock/flow metrics (world totals): divides by world population and multiplies by 1000.
   * For rate/share metrics (already per-person or fractional): returns the value as-is.
   */
  per1k(obs: Observation): number {
    if (SCALABLE_MEASURE_TYPES.has(obs.metric.measure_type)) {
      return this.scale({
        value: obs.value,
        source_population: this.worldPopulation,
        target_population: 1000,
      });
    }
    return obs.value;
  }

  /** Produce a full DerivedValue breakdown for an observation. */
  derive(obs: Observation): DerivedValue {
    const per_1k = this.per1k(obs);
    const isScalable = SCALABLE_MEASURE_TYPES.has(obs.metric.measure_type);
    return {
      raw: obs.value,
      per_person: isScalable ? obs.value / this.worldPopulation : obs.value,
      per_1k,
      as_percentage: isScalable ? (obs.value / this.worldPopulation) * 100 : obs.value / 10,
    };
  }

  /**
   * Find a single observation matching all provided query fields.
   * Returns null if no match or multiple matches.
   */
  getObservation(query: ObservationQuery): Observation | null {
    const results = this.queryObservations(query);
    return results.length === 1 ? results[0] : null;
  }

  /**
   * Return all observations matching all provided query fields.
   * Unspecified fields are not filtered on.
   */
  queryObservations(filter: ObservationQuery): Observation[] {
    return this.observations.filter((obs) => {
      if (filter.id !== undefined && obs.id !== filter.id) return false;
      if (filter.entity_id !== undefined && obs.entity_id !== filter.entity_id) return false;
      if (filter.metric_id !== undefined && obs.metric_id !== filter.metric_id) return false;
      if (filter.geography_id !== undefined && obs.geography_id !== filter.geography_id) return false;
      if (filter.time_period_id !== undefined && obs.time_period_id !== filter.time_period_id) return false;
      if (filter.population_group_id !== undefined && obs.population_group_id !== filter.population_group_id) return false;
      if (filter.domain !== undefined && obs.entity.domain !== filter.domain) return false;
      return true;
    });
  }

  /** Return all observations for a given domain. */
  getDomainObservations(domain: string): Observation[] {
    return this.queryObservations({ domain });
  }

  /** Return the observation for world population (used as reference denominator). */
  getObservationById(id: string): Observation | null {
    return this.queryObservations({ id })[0] ?? null;
  }

  /** Look up a source by its id. Returns null if not found. */
  getSourceById(id: string): Source | null {
    return this.sourcesMap.get(id) ?? null;
  }
}
