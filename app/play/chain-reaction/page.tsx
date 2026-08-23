'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { EstimateInput } from '@/components/EstimateInput';
import { RevealCard } from '@/components/RevealCard';
import { QuestionChain } from '@/components/QuestionChain';
import { DailyComplete } from '@/components/DailyComplete';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  getTodayChain,
  loadDailyProgress,
  saveDailyProgress,
  createFreshProgress,
} from '@/lib/daily';
import { getStatById } from '@/lib/questions';
import { scoreEstimate } from '@/lib/scoring';
import { addScore } from '@/lib/stats';
import type { QuestionChain as Chain, DailyProgress, WorldStat } from '@/types';

type Phase = 'question' | 'revealed';

export default function DailyPage() {
  const [chain, setChain] = useState<Chain | null>(null);
  const [progress, setProgress] = useState<DailyProgress | null>(null);
  const [guess, setGuess] = useState(100);
  const [phase, setPhase] = useState<Phase>('question');
  const [sessionScore, setSessionScore] = useState(0);
  const [lastResult, setLastResult] = useState<{
    points: number;
    label: string;
    percentOff: number;
    stat: WorldStat;
    userGuess: number;
  } | null>(null);
  const [revealedStats, setRevealedStats] = useState<WorldStat[]>([]);

  useEffect(() => {
    const todayChain = getTodayChain();
    setChain(todayChain);

    const saved = loadDailyProgress();
    if (saved && saved.chainId === todayChain.id) {
      setProgress(saved);
      // Restore revealed stats
      const stats: WorldStat[] = [];
      saved.completedQuestions.forEach((qi) => {
        const q = todayChain.questions[qi];
        if (q) {
          const stat = getStatById(q.statId);
          if (stat) stats.push(stat);
        }
      });
      setRevealedStats(stats);
    } else {
      const fresh = createFreshProgress(todayChain);
      setProgress(fresh);
    }
  }, []);

  if (!chain || !progress) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-slate-500">
        Loading today&apos;s chain…
      </div>
    );
  }

  const currentQuestionIndex = progress.completedQuestions.length;
  const currentQuestion = chain.questions[currentQuestionIndex];
  const currentStat = currentQuestion ? getStatById(currentQuestion.statId) : undefined;
  const isComplete = progress.completed || currentQuestionIndex >= chain.questions.length;

  const handleSubmit = () => {
    if (!currentStat || !currentQuestion) return;
    const result = scoreEstimate(guess, currentStat.value_1k);
    setLastResult({ ...result, stat: currentStat, userGuess: guess });
    setSessionScore((s) => s + result.points);
    addScore('mechanic4', result.points);

    const updatedProgress: DailyProgress = {
      ...progress,
      completedQuestions: [...progress.completedQuestions, currentQuestionIndex],
      answers: { ...progress.answers, [currentQuestionIndex]: guess },
    };

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= chain.questions.length) {
      updatedProgress.completed = true;
    }

    setProgress(updatedProgress);
    saveDailyProgress(updatedProgress);
    setRevealedStats((prev) => [...prev, currentStat]);
    setPhase('revealed');
  };

  const handleNext = () => {
    setGuess(100);
    setPhase('question');
  };

  if (isComplete && phase !== 'revealed') {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div>
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">← Home</Link>
          <h1 className="text-xl font-bold text-slate-800 mt-0.5">Chain Reaction</h1>
        </div>
        <Card>
          <DailyComplete
            chain={chain}
            totalScore={sessionScore || Object.values(progress.answers).reduce((acc, ans) => {
              // approximate from saved — show 0 if not tracked this session
              return acc;
            }, 0)}
            answers={progress.answers}
            stats={revealedStats}
          />
        </Card>
      </div>
    );
  }

  const nextQuestion = chain.questions[currentQuestionIndex + 1];
  const showFollowUpIntro = phase === 'revealed' && currentQuestion?.followUpIntro && nextQuestion;

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">← Home</Link>
          <h1 className="text-xl font-bold text-slate-800 mt-0.5">Chain Reaction</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Today&apos;s topic</p>
          <p className="text-sm font-semibold text-slate-700 capitalize">{chain.title}</p>
        </div>
      </div>

      {/* Chain progress */}
      <QuestionChain
        total={chain.questions.length}
        completed={progress.completedQuestions.length}
        topic={chain.topic}
      />

      {/* Question phase */}
      {phase === 'question' && currentQuestion && currentStat && (
        <Card>
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                {currentStat.domain}
              </p>
              <h2 className="text-xl font-semibold text-slate-800 leading-snug">
                {currentQuestion.prompt}
              </h2>
              {currentQuestion.hint && (
                <p className="mt-2 text-sm text-slate-500 italic">{currentQuestion.hint}</p>
              )}
            </div>
            <EstimateInput value={guess} onChange={setGuess} max={1000} unit="out of 1,000 people" />
            <Button size="lg" className="w-full" onClick={handleSubmit}>
              Submit Estimate
            </Button>
          </div>
        </Card>
      )}

      {/* Revealed phase */}
      {phase === 'revealed' && lastResult && (
        <Card>
          <div className="space-y-6">
            <RevealCard
              stat={lastResult.stat}
              userGuess={lastResult.userGuess}
              points={lastResult.points}
              scoreLabel={lastResult.label}
              percentOff={lastResult.percentOff}
            />

            {showFollowUpIntro && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-sm text-amber-800 font-medium">{currentQuestion.followUpIntro}</p>
              </div>
            )}

            {progress.completed ? (
              <Button
                size="lg"
                className="w-full"
                onClick={() => setPhase('question')}
              >
                See Results →
              </Button>
            ) : (
              <Button size="lg" className="w-full" onClick={handleNext}>
                {nextQuestion ? 'Next Question →' : 'See Results →'}
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
