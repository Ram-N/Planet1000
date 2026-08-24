'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { loadUserStats } from '@/lib/stats';
import type { UserStats } from '@/types';

export default function StatsPage() {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    setStats(loadUserStats());
  }, []);

  if (!stats) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-slate-500">
        Loading stats…
      </div>
    );
  }

  const hasPlayed = stats.totalQuestions > 0;

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">← Home</Link>
        <h1 className="text-2xl font-bold text-slate-800 mt-0.5">Your Stats</h1>
      </div>

      {!hasPlayed ? (
        <Card>
          <div className="text-center space-y-4 py-4">
            <div className="text-5xl">🌍</div>
            <p className="text-slate-600">No stats yet — play some questions to see your progress here!</p>
            <Link href="/play/world-of-1000">
              <Button size="lg">Start Playing</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card variant="highlight">
              <p className="text-xs text-emerald-600 uppercase tracking-wide">Total Score</p>
              <p className="text-3xl font-bold text-emerald-700">{stats.totalScore.toLocaleString()}</p>
            </Card>
            <Card variant="highlight">
              <p className="text-xs text-emerald-600 uppercase tracking-wide">Questions</p>
              <p className="text-3xl font-bold text-emerald-700">{stats.totalQuestions}</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Current Streak</p>
              <p className="text-3xl font-bold text-slate-800">🔥 {stats.currentStreak}</p>
              <p className="text-xs text-slate-400">days</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Best Streak</p>
              <p className="text-3xl font-bold text-slate-800">⭐ {stats.longestStreak}</p>
              <p className="text-xs text-slate-400">days</p>
            </Card>
          </div>

          {/* By mechanic */}
          <Card>
            <h2 className="font-bold text-slate-800 mb-4">Score by Game Mode</h2>
            <div className="space-y-3">
              {[
                { label: 'The World of 1,000', score: stats.mechanic1Score, icon: '🌍' },
                { label: 'Estimate → Explain → Reveal', score: stats.mechanic2Score, icon: '🧠' },
                { label: 'Daily World Question', score: stats.mechanic4Score, icon: '📅' },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-3">
                  <span className="text-xl">{m.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{m.label}</p>
                    <p className="text-xs text-slate-400">{m.score.toLocaleString()} pts</p>
                  </div>
                  <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, (m.score / Math.max(1, stats.totalScore)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Average score */}
          {stats.totalQuestions > 0 && (
            <Card variant="muted">
              <p className="text-sm text-slate-600">
                Average score per question:{' '}
                <strong className="text-emerald-700">
                  {Math.round(stats.totalScore / stats.totalQuestions)} pts
                </strong>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                (Max possible: 120 pts with perfect estimate + strong reasoning)
              </p>
            </Card>
          )}

          <div className="flex gap-3 flex-wrap">
            <Link href="/play/world-of-1000"><Button>Keep Playing</Button></Link>
            <Link href="/play/daily"><Button variant="secondary">📅 Daily Chain</Button></Link>
          </div>
        </>
      )}
    </div>
  );
}
