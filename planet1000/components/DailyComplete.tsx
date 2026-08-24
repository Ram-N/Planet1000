'use client';

import { motion } from 'framer-motion';
import type { QuestionChain } from '@/types';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface DailyCompleteProps {
  chain: QuestionChain;
  totalScore: number;
  answers: Record<number, number>;
  stats: Array<{ value_1k: number; unit: string; label: string }>;
}

export function DailyComplete({ chain, totalScore, answers, stats }: DailyCompleteProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="text-5xl">🌍</div>
        <h2 className="text-2xl font-bold text-slate-800">Chain Complete!</h2>
        <p className="text-slate-500">{chain.title}</p>
        <p className="text-4xl font-bold text-emerald-600 mt-2">+{totalScore} pts</p>
      </div>

      {/* Summary of answers */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-700">Your answers vs. reality:</h3>
        {chain.questions.map((q, i) => {
          const stat = stats[i];
          const guess = answers[i] ?? 0;
          if (!stat) return null;
          return (
            <div key={q.id} className="bg-slate-50 rounded-xl p-3 space-y-1">
              <p className="text-sm font-medium text-slate-700">{q.prompt}</p>
              <div className="flex gap-6 text-sm">
                <span className="text-blue-600">
                  Your guess: <strong>{guess}</strong>
                </span>
                <span className="text-emerald-600">
                  Actual: <strong>{stat.value_1k} {stat.unit}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-center text-sm text-slate-500">Come back tomorrow for a new chain!</p>
        <Link href="/">
          <Button className="w-full" size="lg">Back to Home</Button>
        </Link>
        <Link href="/stats">
          <Button variant="secondary" className="w-full">View My Stats</Button>
        </Link>
      </div>
    </motion.div>
  );
}
