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
  scale_fact?: Fact;
}

interface BarChartSection {
  type: 'bar_chart';
  heading?: string;
  caption?: string;
  x_label?: string;
  bars: { label: string; value: number }[];
}

interface TableSection {
  type: 'table';
  heading?: string;
  caption?: string;
  columns: string[];
  rows: { cells: string[] }[];
}

interface BulletListSection {
  type: 'bullet_list';
  heading?: string;
  items: { icon?: string; label: string; value?: string; note?: string }[];
}

interface SourcesSection {
  type: 'sources';
  heading?: string;
  sources: { title: string; description?: string; url?: string }[];
}

interface TextSection {
  type: 'text';
  heading?: string;
  body: string;
}

type SummarySection = BarChartSection | TableSection | BulletListSection | SourcesSection | TextSection;

interface KnowledgeSummary {
  id: string;
  title: string;
  description?: string;
  domain: string;
  data_year?: number;
  updated_at?: string;
  sections: SummarySection[];
  related_summary_ids?: string[];
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

// ── Summary section renderers ─────────────────────────────────────────────────

function SummaryBarChart({ section }: { section: BarChartSection }) {
  const max = Math.max(...section.bars.map((b) => b.value), 1);
  return (
    <div className="mb-6">
      {section.heading && <h3 className="font-semibold text-slate-700 mb-1">{section.heading}</h3>}
      {section.caption && <p className="text-xs text-slate-500 mb-3">{section.caption}</p>}
      <div className="space-y-2">
        {section.bars.map((bar, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-sm text-slate-600 w-32 shrink-0 text-right">{bar.label}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
              <div
                className="bg-emerald-500 h-5 rounded-full"
                style={{ width: `${(bar.value / max) * 100}%` }}
              />
            </div>
            <span className="text-sm font-mono text-slate-700 w-12 shrink-0">{bar.value}</span>
          </div>
        ))}
      </div>
      {section.x_label && (
        <p className="text-xs text-slate-400 mt-2 text-right">{section.x_label}</p>
      )}
    </div>
  );
}

function SummaryTable({ section }: { section: TableSection }) {
  return (
    <div className="mb-6 overflow-x-auto">
      {section.heading && <h3 className="font-semibold text-slate-700 mb-2">{section.heading}</h3>}
      {section.caption && <p className="text-xs text-slate-500 mb-2">{section.caption}</p>}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {section.columns.map((col, i) => (
              <th
                key={i}
                className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 pb-2 px-2 first:pl-0"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-slate-100 last:border-0">
              {row.cells.map((cell, ci) => (
                <td key={ci} className="py-2 px-2 first:pl-0 text-slate-700 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryBulletList({ section }: { section: BulletListSection }) {
  return (
    <div className="mb-6">
      {section.heading && <h3 className="font-semibold text-slate-700 mb-2">{section.heading}</h3>}
      <ul className="space-y-2">
        {section.items.map((item, i) => (
          <li key={i} className="flex items-baseline gap-2 text-sm">
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span className="font-medium text-slate-700">{item.label}</span>
            {item.value && <span className="font-bold text-emerald-700">{item.value}</span>}
            {item.note && <span className="text-slate-500">{item.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummarySources({ section }: { section: SourcesSection }) {
  return (
    <div className="mb-2">
      {section.heading && (
        <h3 className="font-semibold text-slate-700 mb-2">{section.heading}</h3>
      )}
      <ul className="space-y-2">
        {section.sources.map((src, i) => (
          <li key={i} className="text-sm">
            {src.url ? (
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-700 hover:underline"
              >
                {src.title}
              </a>
            ) : (
              <span className="font-medium text-slate-700">{src.title}</span>
            )}
            {src.description && (
              <p className="text-slate-500 text-xs mt-0.5">{src.description}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryText({ section }: { section: TextSection }) {
  return (
    <div className="mb-6">
      {section.heading && <h3 className="font-semibold text-slate-700 mb-1">{section.heading}</h3>}
      <p className="text-slate-700 text-sm leading-relaxed">{section.body}</p>
    </div>
  );
}

function SummaryPreview({ summary }: { summary: KnowledgeSummary }) {
  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex items-baseline gap-3 mb-3 flex-wrap">
        <span className="font-semibold text-slate-800">{summary.title}</span>
        {summary.data_year && (
          <span className="text-xs text-slate-400">data: {summary.data_year}</span>
        )}
      </div>
      {summary.description && (
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">{summary.description}</p>
      )}
      {summary.sections.map((section, i) => {
        switch (section.type) {
          case 'bar_chart':   return <SummaryBarChart key={i} section={section} />;
          case 'table':       return <SummaryTable key={i} section={section} />;
          case 'bullet_list': return <SummaryBulletList key={i} section={section} />;
          case 'sources':     return <SummarySources key={i} section={section} />;
          case 'text':        return <SummaryText key={i} section={section} />;
          default:            return null;
        }
      })}
    </div>
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
  const summaryPath = summaryId ? path.join(SUMMARIES_DIR, `${summaryId}.json`) : null;
  const summaryExists = summaryPath ? fs.existsSync(summaryPath) : false;
  const summary = summaryExists && summaryPath ? readJson<KnowledgeSummary>(summaryPath) : null;

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
              fact={generated.scale_fact}
            />
          </>
        ) : (
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 mb-4 text-slate-400 text-sm italic">
            Hints not available — build the generated file to see resolved hints.
          </div>
        )}

        {/* Summary */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Summary
          </div>
          {summaryId ? (
            <>
              <div className="flex items-center gap-2">
                <code className="font-mono text-slate-700 text-sm">{summaryId}</code>
                {summaryExists ? (
                  <span className="text-emerald-600 font-medium text-sm">✓</span>
                ) : (
                  <span className="text-red-500 font-semibold text-sm">✗ MISSING</span>
                )}
              </div>
              {summary ? (
                <SummaryPreview summary={summary} />
              ) : summaryExists ? (
                <p className="text-amber-600 text-sm mt-2 italic">Summary file exists but could not be parsed.</p>
              ) : (
                <p className="text-slate-400 text-sm mt-2 italic">
                  Run{' '}
                  <code className="font-mono bg-slate-100 px-1 rounded">
                    npm run summary -- build {summaryId}
                  </code>{' '}
                  to generate.
                </p>
              )}
            </>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </section>

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
