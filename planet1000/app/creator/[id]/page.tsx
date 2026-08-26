import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const PUZZLES_DIR = path.join(process.cwd(), 'data', 'puzzles');
const GENERATED_DIR = path.join(process.cwd(), 'data', 'generated', 'puzzles');
const SUMMARIES_DIR = path.join(process.cwd(), 'data', 'summaries');

// ── Types ───────────────────────────────────────────────────────────────────

interface Fact {
  text: string;
  source_label?: string;
  source_url?: string;
}

interface ManifestPuzzle {
  id: string;
  week_id: string;
  publish_date: string;
  domain: string;
  question: string;
  answer_explanation?: string;
  observation_id?: string;
  summary_id?: string;
}

interface GeneratedPuzzle extends ManifestPuzzle {
  answer_value_1k?: number;
  answer_unit?: string;
  relationship_fact?: Fact;
  temporal_fact?: Fact;
  anchor_fact?: Fact;
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

// ── Domain badge ─────────────────────────────────────────────────────────────

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
  return DOMAIN_COLORS[domain?.toLowerCase()] ?? 'bg-slate-100 text-slate-700';
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
        {label}
      </div>
      {children}
    </section>
  );
}

function HintBlock({
  slot,
  label,
  gameNote,
  fact,
}: {
  slot: number;
  label: string;
  gameNote: string;
  fact?: Fact;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4">
      <div className="flex items-baseline gap-2 mb-3 flex-wrap">
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
          Hint {slot} — {label}
        </span>
        <span className="text-xs text-slate-400">({gameNote})</span>
      </div>
      {fact ? (
        <>
          <p className="text-slate-700 leading-relaxed">{fact.text}</p>
          {fact.source_label && (
            <p className="text-xs text-slate-400 mt-2">
              Source:{' '}
              {fact.source_url ? (
                <a
                  href={fact.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline"
                >
                  {fact.source_label}
                </a>
              ) : (
                fact.source_label
              )}
            </p>
          )}
        </>
      ) : (
        <p className="text-slate-400 italic text-sm">No hint data</p>
      )}
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PuzzlePreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const manifestPath = path.join(PUZZLES_DIR, `${id}.json`);
  const generatedPath = path.join(GENERATED_DIR, `${id}.json`);

  const hasManifest = fs.existsSync(manifestPath);
  const hasGenerated = fs.existsSync(generatedPath);

  if (!hasManifest && !hasGenerated) {
    notFound();
  }

  const manifest = hasManifest ? readJson<ManifestPuzzle>(manifestPath) : null;
  const generated = hasGenerated ? readJson<GeneratedPuzzle>(generatedPath) : null;

  // Use generated as source of truth where available
  const data = (generated ?? manifest)!;

  const summaryId = data.summary_id;
  const summaryExists = summaryId
    ? fs.existsSync(path.join(SUMMARIES_DIR, `${summaryId}.json`))
    : false;

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">

        {/* Back link */}
        <div className="mb-6">
          <Link href="/creator" className="text-emerald-700 hover:underline text-sm">
            ← Back to creator dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="mb-6 flex items-center gap-2 flex-wrap text-sm">
          <span className="font-mono text-slate-500">{id}</span>
          <span className="text-slate-300">·</span>
          <span className="font-mono text-slate-500">{data.week_id}</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500">{data.publish_date}</span>
          <span className="text-slate-300">·</span>
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium uppercase ${domainClasses(data.domain)}`}
          >
            {data.domain}
          </span>
        </div>

        {/* Build notice */}
        {!hasGenerated && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
            Generated file not found. Run{' '}
            <code className="font-mono bg-amber-100 px-1 rounded">npm run build:puzzles</code>{' '}
            to see resolved content.
          </div>
        )}

        {/* Question */}
        <Section label="Question">
          <p className="text-slate-800 text-lg leading-relaxed">{data.question}</p>
        </Section>

        {/* Answer */}
        {generated ? (
          <section className="bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm p-6 mb-4">
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-3">
              Answer
            </div>
            <p className="text-emerald-900 text-2xl font-bold mb-3">
              {generated.answer_value_1k} {generated.answer_unit ?? 'people'} out of 1,000
            </p>
            {generated.answer_explanation && (
              <p className="text-emerald-800 text-sm leading-relaxed">
                {generated.answer_explanation}
              </p>
            )}
          </section>
        ) : manifest?.answer_explanation ? (
          <Section label="Answer explanation">
            <p className="text-slate-700 text-sm leading-relaxed">{manifest.answer_explanation}</p>
          </Section>
        ) : null}

        {/* Hints */}
        {generated ? (
          <>
            <HintBlock
              slot={1}
              label="Relationship"
              gameNote="shown after Guess 1"
              fact={generated.relationship_fact}
            />
            <HintBlock
              slot={2}
              label="Temporal"
              gameNote="shown after Guess 2"
              fact={generated.temporal_fact}
            />
            <HintBlock
              slot={3}
              label="Anchor"
              gameNote="shown after Guess 3"
              fact={generated.anchor_fact}
            />
          </>
        ) : (
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 mb-4 text-slate-400 text-sm italic">
            Hints not available — build the generated file to see resolved hints.
          </div>
        )}

        {/* Summary */}
        <Section label="Summary">
          {summaryId ? (
            <div className="flex items-center gap-2">
              <code className="font-mono text-slate-700 text-sm">{summaryId}</code>
              {summaryExists ? (
                <span className="text-emerald-600 font-medium text-sm">✓</span>
              ) : (
                <span className="text-red-500 font-semibold text-sm">✗ MISSING</span>
              )}
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </Section>

        {/* Observation */}
        {data.observation_id && (
          <Section label="Observation">
            <code className="font-mono text-slate-700 text-sm">{data.observation_id}</code>
          </Section>
        )}
      </div>
    </main>
  );
}
