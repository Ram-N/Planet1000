'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { EstimateInput } from '@/components/EstimateInput';
import { RevealCard } from '@/components/RevealCard';
import { ScoreBadge } from '@/components/ScoreBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getShuffledQuestions, getStatById } from '@/lib/questions';
import { scoreEstimate } from '@/lib/scoring';
import { addScore } from '@/lib/stats';
import type { Question, WorldStat } from '@/types';

// 'guess'  → player makes a first estimate (no hint shown)
// 'hint'   → hint is revealed; player can refine before committing
// 'revealed' → answer shown, score based on final estimate
// 'done'   → session complete
type Phase = 'guess' | 'hint' | 'revealed' | 'done';

export default function WorldOf1000Page() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guess, setGuess] = useState(100);
  const [phase, setPhase] = useState<Phase>('guess');
  const [sessionScore, setSessionScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [lastResult, setLastResult] = useState<{
    points: number;
    label: string;
    percentOff: number;
    stat: WorldStat;
    userGuess: number;
  } | null>(null);

  useEffect(() => {
    setQuestions(getShuffledQuestions());
  }, []);

  const currentQuestion = questions[currentIndex];
  const currentStat = currentQuestion ? getStatById(currentQuestion.statId) : undefined;

  // First guess locks in nothing — just reveals the hint
  const handleFirstGuess = () => {
    setPhase('hint');
  };

  // Final submission scores the estimate
  const handleSubmit = () => {
    if (!currentStat) return;
    const result = scoreEstimate(guess, currentStat.value_1k);
    setLastResult({ ...result, stat: currentStat, userGuess: guess });
    setSessionScore((s) => s + result.points);
    setQuestionsAnswered((q) => q + 1);
    addScore('mechanic1', result.points);
    setPhase('revealed');
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      setPhase('done');
    } else {
      setCurrentIndex(nextIndex);
      setGuess(100);
      setPhase('guess');
    }
  };

  if (questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-slate-500">
        Loading questions…
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="text-6xl">🎉</div>
        <h2 className="text-3xl font-bold text-slate-800">Session Complete!</h2>
        <p className="text-slate-600">You answered all {questionsAnswered} questions.</p>
        <p className="text-4xl font-bold text-emerald-600">{sessionScore.toLocaleString()} pts</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button onClick={() => {
            setCurrentIndex(0); setGuess(100); setSessionScore(0);
            setQuestionsAnswered(0); setPhase('guess');
            setQuestions(getShuffledQuestions());
          }}>
            Play Again
          </Button>
          <Link href="/"><Button variant="secondary">Home</Button></Link>
          <Link href="/stats"><Button variant="ghost">View Stats</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">← Home</Link>
          <h1 className="text-xl font-bold text-slate-800 mt-0.5">Planet1000</h1>
        </div>
        <ScoreBadge score={sessionScore} questionsAnswered={questionsAnswered} />
      </div>

      {/* Progress */}
      <div className="text-xs text-slate-400">
        Question {currentIndex + 1} of {questions.length}
      </div>

      {/* Phase: first guess — no hint shown */}
      {phase === 'guess' && currentQuestion && currentStat && (
        <Card>
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                {currentStat.domain} · {currentStat.dimension}
              </p>
              <h2 className="text-xl font-semibold text-slate-800 leading-snug">
                {currentQuestion.prompt}
              </h2>
            </div>

            <EstimateInput value={guess} onChange={setGuess} max={1000} unit="out of 1,000 people" />

            <Button size="lg" className="w-full" onClick={handleFirstGuess}>
              Take a Guess →
            </Button>
          </div>
        </Card>
      )}

      {/* Phase: hint revealed — player can refine */}
      {phase === 'hint' && currentQuestion && currentStat && (
        <Card>
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                {currentStat.domain} · {currentStat.dimension}
              </p>
              <h2 className="text-xl font-semibold text-slate-800 leading-snug">
                {currentQuestion.prompt}
              </h2>
            </div>

            {/* Hint revealed after first guess */}
            {currentQuestion.hint && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Hint</p>
                <p className="text-sm text-amber-900 leading-relaxed">{currentQuestion.hint}</p>
              </div>
            )}

            <EstimateInput value={guess} onChange={setGuess} max={1000} unit="out of 1,000 people" />

            <Button size="lg" className="w-full" onClick={handleSubmit}>
              Submit Final Answer →
            </Button>
          </div>
        </Card>
      )}

      {/* Phase: revealed */}
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
            <Button size="lg" className="w-full" onClick={handleNext}>
              Next Question →
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
