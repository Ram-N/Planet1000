'use client';

import { motion } from 'framer-motion';
import type { WorldStat } from '@/types';

interface RevealCardProps {
  stat: WorldStat;
  userGuess: number;
  points: number;
  scoreLabel: string;
  percentOff: number;
}

export function RevealCard({ stat, userGuess, points, scoreLabel, percentOff }: RevealCardProps) {
  const actual = stat.value_1k;
  const guessWidth = Math.min(100, (userGuess / 1000) * 100);
  const actualWidth = Math.min(100, (actual / 1000) * 100);

  const offText =
    percentOff === 0
      ? 'Exact!'
      : `${Math.round(percentOff * 100)}% off`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Score header */}
      <div className="text-center">
        <p className="text-5xl font-bold text-emerald-600">+{points}</p>
        <p className="text-xl font-semibold text-slate-700 mt-1">{scoreLabel}</p>
        <p className="text-sm text-slate-500 mt-0.5">{offText}</p>
      </div>

      {/* Comparison bars */}
      <div className="space-y-3 bg-slate-50 rounded-2xl p-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-slate-600">Your guess</span>
            <span className="font-bold text-slate-800">{userGuess} {stat.unit}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
            <motion.div
              className="bg-blue-400 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${guessWidth}%` }}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-slate-600">Actual answer</span>
            <span className="font-bold text-emerald-700">{actual} {stat.unit}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
            <motion.div
              className="bg-emerald-500 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${actualWidth}%` }}
              transition={{ duration: 0.6, delay: 0.4 }}
            />
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
        <h4 className="font-semibold text-emerald-800 mb-1">Did you know?</h4>
        <p className="text-emerald-900 text-sm leading-relaxed">{stat.explanation}</p>
      </div>
    </motion.div>
  );
}
