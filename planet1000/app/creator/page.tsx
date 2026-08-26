import fs from 'fs';
import path from 'path';
import Link from 'next/link';

const PUZZLES_DIR = path.join(process.cwd(), 'data', 'puzzles');
const GENERATED_DIR = path.join(process.cwd(), 'data', 'generated', 'puzzles');

// ── ISO week utilities ──────────────────────────────────────────────────────

function getCurrentISOWeek(): { year: number; week: number } {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dow = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: utc.getUTCFullYear(), week };
}

function getMondayOfISOWeek(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (dow - 1) + (week - 1) * 7);
  return monday;
}

function isoWeekFromDate(date: Date): { year: number; week: number } {
  const d = new Date(date);
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

function weekIdFromYearWeek(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function puzzleIdFromWeekId(weekId: string): string {
  // "2026-W35" → "puzzle_2026_w35"
  return 'puzzle_' + weekId.toLowerCase().replace('-w', '_w');
}

function firstNWords(text: string, n = 8): string {
  const words = text.trim().split(/\s+/);
  return words.length > n ? words.slice(0, n).join(' ') + '…' : text;
}

// ── Status helpers ──────────────────────────────────────────────────────────

type StatusInfo = { label: string; classes: string };

function getStatus(hasManifest: boolean, hasGenerated: boolean): StatusInfo {
  if (hasManifest && hasGenerated) {
    return { label: 'Ready', classes: 'bg-emerald-100 text-emerald-800' };
  }
  if (hasManifest) {
    return { label: 'Needs build', classes: 'bg-amber-100 text-amber-800' };
  }
  return { label: 'Not created', classes: 'bg-slate-100 text-slate-600' };
}

const DOMAIN_COLORS: Record<string, string> = {
  housing:     'bg-blue-100 text-blue-800',
  health:      'bg-emerald-100 text-emerald-800',
  education:   'bg-violet-100 text-violet-800',
  environment: 'bg-green-100 text-green-800',
  economy:     'bg-amber-100 text-amber-800',
  food:        'bg-orange-100 text-orange-800',
  energy:      'bg-yellow-100 text-yellow-800',
  population:  'bg-cyan-100 text-cyan-800',
};

function domainClasses(domain: string): string {
  return DOMAIN_COLORS[domain.toLowerCase()] ?? 'bg-slate-100 text-slate-700';
}

// ── Types ───────────────────────────────────────────────────────────────────

interface ManifestPuzzle {
  id: string;
  week_id: string;
  publish_date: string;
  domain: string;
  question: string;
  observation_id?: string;
  summary_id?: string;
  answer_explanation?: string;
}

interface GeneratedPuzzle extends ManifestPuzzle {
  answer_value_1k?: number;
  answer_unit?: string;
  relationship_fact?: { text: string; source_label?: string };
  temporal_fact?: { text: string; source_label?: string };
  scale_fact?: { text: string; source_label?: string };
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function CreatorDashboard() {
  const { year, week } = getCurrentISOWeek();
  const baseMonday = getMondayOfISOWeek(year, week);

  const rows = Array.from({ length: 21 }, (_, i) => {
    const monday = new Date(baseMonday);
    monday.setUTCDate(baseMonday.getUTCDate() + i * 7);

    const { year: wy, week: ww } = isoWeekFromDate(monday);
    const weekId = weekIdFromYearWeek(wy, ww);
    const publishDate = monday.toISOString().slice(0, 10);
    const puzzleId = puzzleIdFromWeekId(weekId);

    const manifestPath = path.join(PUZZLES_DIR, `${puzzleId}.json`);
    const generatedPath = path.join(GENERATED_DIR, `${puzzleId}.json`);

    const hasManifest = fs.existsSync(manifestPath);
    const hasGenerated = fs.existsSync(generatedPath);

    const manifest = hasManifest ? readJson<ManifestPuzzle>(manifestPath) : null;
    const generated = hasGenerated ? readJson<GeneratedPuzzle>(generatedPath) : null;

    const data = generated ?? manifest;
    const status = getStatus(hasManifest, hasGenerated);
    const canLink = hasManifest || hasGenerated;

    return { weekId, publishDate, puzzleId, hasManifest, hasGenerated, manifest, generated, data, status, canLink, isCurrentWeek: i === 0 };
  });

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Creator Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Current week through +20 weeks — past puzzles excluded.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Week</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Publish date</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Domain</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Question + hints</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Answer</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.weekId}
                  className={`border-b border-slate-100 ${
                    row.isCurrentWeek ? 'bg-emerald-50' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Week ID */}
                  <td className="px-4 py-3 font-mono text-xs align-top">
                    {row.canLink ? (
                      <Link
                        href={`/creator/${row.puzzleId}`}
                        className="text-emerald-700 hover:underline font-semibold"
                      >
                        {row.weekId}
                      </Link>
                    ) : (
                      <span className="text-slate-400">{row.weekId}</span>
                    )}
                    {row.isCurrentWeek && (
                      <span className="block text-emerald-600 text-xs mt-0.5">current</span>
                    )}
                  </td>

                  {/* Publish date */}
                  <td className="px-4 py-3 text-slate-600 align-top whitespace-nowrap">
                    {row.publishDate}
                  </td>

                  {/* Domain badge */}
                  <td className="px-4 py-3 align-top">
                    {row.data?.domain ? (
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${domainClasses(row.data.domain)}`}
                      >
                        {row.data.domain}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  {/* Question + hint quick-scan */}
                  <td className="px-4 py-3 max-w-sm align-top">
                    {row.data?.question ? (
                      <div>
                        <span className="text-slate-700">
                          {row.data.question.length > 80
                            ? row.data.question.slice(0, 80) + '…'
                            : row.data.question}
                        </span>
                        {row.generated && (
                          <div className="mt-1.5 space-y-0.5">
                            {row.generated.relationship_fact && (
                              <div className="text-xs text-slate-400">
                                <span className="text-slate-300 font-mono mr-1">H1</span>
                                {firstNWords(row.generated.relationship_fact.text)}
                              </div>
                            )}
                            {row.generated.temporal_fact && (
                              <div className="text-xs text-slate-400">
                                <span className="text-slate-300 font-mono mr-1">H2</span>
                                {firstNWords(row.generated.temporal_fact.text)}
                              </div>
                            )}
                            {row.generated.scale_fact && (
                              <div className="text-xs text-slate-400">
                                <span className="text-slate-300 font-mono mr-1">H3</span>
                                {firstNWords(row.generated.scale_fact.text)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  {/* Answer */}
                  <td className="px-4 py-3 align-top whitespace-nowrap font-medium text-slate-700">
                    {row.generated?.answer_value_1k !== undefined ? (
                      <span>{row.generated.answer_value_1k} / 1,000</span>
                    ) : (
                      <span className="text-slate-300 font-normal">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${row.status.classes}`}
                    >
                      {row.status.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
