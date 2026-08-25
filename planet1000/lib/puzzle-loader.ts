import type { WeeklyPuzzle, KnowledgeArtifact } from '@/types/puzzle';

// Static puzzle registry — add new puzzles here as they are published
import puzzle_2026_w35 from '@/data/puzzles/puzzle_2026_w35.json';
import artifact_global_homelessness from '@/data/artifacts/artifact_global_homelessness.json';

const PUZZLES: WeeklyPuzzle[] = [
  puzzle_2026_w35 as WeeklyPuzzle,
];

const ARTIFACTS: KnowledgeArtifact[] = [
  artifact_global_homelessness as KnowledgeArtifact,
];

/** Returns the ISO week string for a given date, e.g. "2026-W35". */
function getISOWeekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7; // Monday = 1 ... Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Returns the puzzle for the current ISO week, or the most recently
 * published puzzle if no puzzle exists for this week yet.
 */
export function getCurrentWeeklyPuzzle(): WeeklyPuzzle {
  const weekId = getISOWeekId();
  const exact = PUZZLES.find((p) => p.week_id === weekId);
  if (exact) return exact;

  // Fall back to the most recent available puzzle
  const sorted = [...PUZZLES].sort((a, b) =>
    b.publish_date.localeCompare(a.publish_date),
  );
  return sorted[0];
}

export function getPuzzleById(id: string): WeeklyPuzzle | null {
  return PUZZLES.find((p) => p.id === id) ?? null;
}

export function getArtifactById(id: string): KnowledgeArtifact | null {
  return ARTIFACTS.find((a) => a.id === id) ?? null;
}
