'use client';

import { motion } from 'framer-motion';
import type {
  KnowledgeSummary,
  SummarySection,
  BulletItem,
  ChartBar,
  TableRow,
  SummarySource,
} from '@/types/puzzle';

// ── Section renderers ─────────────────────────────────────────────────────────

function TextSection({ heading, body }: { heading?: string; body: string }) {
  return (
    <div className="space-y-1">
      {heading && <h4 className="font-semibold text-slate-800 text-sm">{heading}</h4>}
      <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}

function BarChart({
  heading,
  caption,
  bars,
  x_label,
}: {
  heading: string;
  caption?: string;
  bars: ChartBar[];
  x_label: string;
}) {
  const max = Math.max(...bars.map((b) => b.value));
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-slate-800 text-sm">{heading}</h4>
      <div className="space-y-2">
        {bars.map((bar, i) => {
          const pct = max > 0 ? (bar.value / max) * 100 : 0;
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-slate-600 w-28 text-right shrink-0">{bar.label}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                <motion.div
                  className="bg-blue-500 h-full rounded-full flex items-center justify-end pr-2"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08 }}
                >
                  {pct > 15 && (
                    <span className="text-white text-xs font-medium">{bar.value}</span>
                  )}
                </motion.div>
              </div>
              {pct <= 15 && (
                <span className="text-xs font-medium text-slate-700 w-8">{bar.value}</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500 text-center">{x_label}</p>
      {caption && <p className="text-xs text-slate-500 leading-relaxed">{caption}</p>}
    </div>
  );
}

function BulletList({ heading, items }: { heading: string; items: BulletItem[] }) {
  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-slate-800 text-sm">{heading}</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-700">
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span>
              <span className="font-semibold">{item.label}: {item.value}</span>
              {item.note && <span className="text-slate-500"> {item.note}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DataTable({ heading, columns, rows }: { heading?: string; columns: string[]; rows: TableRow[] }) {
  return (
    <div className="space-y-2">
      {heading && <h4 className="font-semibold text-slate-800 text-sm">{heading}</h4>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              {columns.map((col, i) => (
                <th key={i} className="pb-2 pr-3 text-left font-semibold text-slate-600 last:pr-0">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-slate-100 last:border-0">
                {row.cells.map((cell, ci) => (
                  <td
                    key={ci}
                    className={[
                      'py-2 pr-3 last:pr-0 text-slate-600 align-top',
                      ci === 0 ? 'font-semibold text-slate-800' : '',
                    ].join(' ')}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SourcesList({ heading, sources }: { heading: string; sources: SummarySource[] }) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-slate-800 text-sm">{heading}</h4>
      <ol className="space-y-3 list-decimal list-inside">
        {sources.map((src, i) => (
          <li key={i} className="text-sm text-slate-700">
            <span className="font-semibold">
              {src.url ? (
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {src.title} ↗
                </a>
              ) : (
                src.title
              )}
              :
            </span>{' '}
            <span className="text-slate-500">{src.description}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Section({ section }: { section: SummarySection }) {
  switch (section.type) {
    case 'text':
      return <TextSection heading={section.heading} body={section.body} />;
    case 'bar_chart':
      return (
        <BarChart
          heading={section.heading}
          caption={section.caption}
          bars={section.bars}
          x_label={section.x_label}
        />
      );
    case 'bullet_list':
      return <BulletList heading={section.heading} items={section.items} />;
    case 'table':
      return <DataTable heading={section.heading} columns={section.columns} rows={section.rows} />;
    case 'sources':
      return <SourcesList heading={section.heading} sources={section.sources} />;
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export function SummaryArtifact({ artifact }: { artifact: KnowledgeSummary }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="border-t border-slate-200 pt-6 space-y-6"
    >
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
          Explore the Answer
        </p>
        <h3 className="text-lg font-bold text-slate-800">{artifact.title}</h3>
        {artifact.description && (
          <p className="text-sm text-slate-500 mt-0.5">{artifact.description}</p>
        )}
      </div>

      {artifact.sections.map((section, i) => (
        <div
          key={i}
          className="bg-slate-50 rounded-2xl p-4"
        >
          <Section section={section} />
        </div>
      ))}
    </motion.div>
  );
}
