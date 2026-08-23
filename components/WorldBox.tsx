'use client';

import { motion } from 'framer-motion';

export interface Segment {
  label: string;
  value: number; // out of total (1000)
  color: string;
  textColor?: string;
}

interface WorldBoxProps {
  segments: Segment[];
  total?: number;
}

const COLORS = [
  { bg: 'bg-emerald-400', text: 'text-white' },
  { bg: 'bg-blue-400', text: 'text-white' },
  { bg: 'bg-amber-400', text: 'text-slate-900' },
  { bg: 'bg-rose-400', text: 'text-white' },
  { bg: 'bg-purple-400', text: 'text-white' },
  { bg: 'bg-cyan-400', text: 'text-slate-900' },
  { bg: 'bg-orange-400', text: 'text-white' },
  { bg: 'bg-indigo-400', text: 'text-white' },
];

export function getSegmentColor(index: number) {
  return COLORS[index % COLORS.length];
}

export function WorldBox({ segments, total = 1000 }: WorldBoxProps) {
  const nonZero = segments.filter((s) => s.value > 0);

  return (
    <div className="space-y-3">
      {/* The box */}
      <div className="w-full h-24 rounded-xl overflow-hidden flex shadow-inner border border-slate-200">
        {nonZero.map((seg, i) => {
          const pct = (seg.value / total) * 100;
          return (
            <motion.div
              key={`${seg.label}-${i}`}
              className={`${seg.color} flex items-center justify-center relative overflow-hidden`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, ease: 'easeInOut' }}
              title={`${seg.label}: ${seg.value} people`}
            >
              {pct > 8 && (
                <span className={`text-xs font-bold ${seg.textColor ?? 'text-white'} px-1 text-center leading-tight`}>
                  {seg.label}
                  <br />
                  <span className="font-normal">{seg.value}</span>
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {nonZero.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-sm">
            <div className={`w-3 h-3 rounded-sm ${seg.color}`} />
            <span className="text-slate-700">
              {seg.label}: <strong>{seg.value}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
