/**
 * Slim puzzle manifest — source of truth in data/puzzles/.
 * The build script (build:puzzles) expands this into a full WeeklyPuzzle
 * by resolving observation facts and computing answer_value_1k from world-model.json.
 */
export interface PuzzleSource {
  id: string;
  week_id: string;
  publish_date: string;
  domain: string;
  question: string;
  observation_id: string;
  answer_explanation: string;
  summary_id: string;
}

/** A single fact attached to a weekly puzzle (with optional source attribution). */
export interface PuzzleFact {
  text: string;
  source_url?: string;
  source_label?: string;
}

/** A playable weekly Planet 1000 puzzle. */
export interface WeeklyPuzzle {
  id: string;            // e.g. "puzzle_2026_w35"
  week_id: string;       // ISO week: "2026-W35"
  publish_date: string;  // "YYYY-MM-DD"
  domain: string;
  question: string;
  answer_value_1k: number;
  answer_unit: string;
  answer_explanation: string;
  /** Hint 1 (shown after Guess 1): comparative context */
  relationship_fact: PuzzleFact;
  /** Hint 2 (shown after Guess 2): trend / change over time */
  temporal_fact: PuzzleFact;
  /** Hint 3 (shown after Guess 3): concrete scale reference */
  anchor_fact: PuzzleFact;
  /** References a KnowledgeSummary by id */
  summary_id: string;
}

// ── Knowledge Summary types ────────────────────────────────────────────────────

export interface BulletItem {
  icon?: string;
  label: string;
  value: string;
  note?: string;
}

export interface ChartBar {
  label: string;
  value: number;
}

export interface TableRow {
  cells: string[];
}

export interface SummarySource {
  title: string;
  description: string;
  url?: string;
}

export type SummarySection =
  | { type: 'text'; heading?: string; body: string }
  | { type: 'bullet_list'; heading: string; items: BulletItem[] }
  | { type: 'bar_chart'; heading: string; caption?: string; bars: ChartBar[]; x_label: string }
  | { type: 'table'; heading?: string; columns: string[]; rows: TableRow[] }
  | { type: 'sources'; heading: string; sources: SummarySource[] };

/**
 * A reusable body of researched knowledge referenced by a puzzle's summary_id.
 * Rendered on the post-game summary page.
 */
export interface KnowledgeSummary {
  id: string;           // e.g. "summary_global_homelessness"
  title: string;
  description: string;
  domain: string;
  data_year: number;
  updated_at: string;
  sections: SummarySection[];
  related_summary_ids: string[];
}
