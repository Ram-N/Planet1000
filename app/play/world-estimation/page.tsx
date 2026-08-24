'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { EstimateInput } from '@/components/EstimateInput';
import { RevealCard } from '@/components/RevealCard';
import { ScoreBadge } from '@/components/ScoreBadge';
import { ReasoningSelector } from '@/components/ReasoningSelector';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getShuffledQuestions, getStatById } from '@/lib/questions';
import { scoreEstimate, scoreReasoning } from '@/lib/scoring';
import { getReasoningQuality, getReasoningFeedback } from '@/lib/reasoning';
import { addScore } from '@/lib/stats';
import type { Question, WorldStat } from '@/types';

// 'estimate' → player makes a first guess (no hint shown)
// 'hint'     → hint revealed; player can refine before picking reasoning
// 'reasoning' → player picks reasoning approach
// 'revealed'  → answer and score shown
// 'done'      → session complete
type Phase = 'estimate' | 'hint' | 'reasoning' | 'revealed' | 'done';

// Only use questions that have reasoningOptions
function getExplainQuestions(all: Question[]): Question[] {
  return all.filter((q) => q.reasoningOptions && q.reasoningOptions.length > 0);
}

export default function EstimateExplainPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guess, setGuess] = useState(100);
  const [selectedReasoning, setSelectedReasoning] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('estimate');
  const [sessionScore, setSessionScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [lastResult, setLastResult] = useState<{
    estimatePoints: number;
    reasoningPoints: number;
    scoreLabel: string;
    percentOff: number;
    reasoningFeedback: string;
    stat: WorldStat;
    userGuess: number;
  } | null>(null);

  useEffect(() => {
    setQuestions(getExplainQuestions(getShuffledQuestions()));
  }, []);

  const currentQuestion = questions[currentIndex];
  const currentStat = currentQuestion ? getStatById(currentQuestion.statId) : undefined;

  const handleFirstGuess = () => {
    setPhase('hint');
  };

  const handleHintSubmit = () => {
    setPhase('reasoning');
  };

  const handleReasoningSubmit = () => {
    if (!currentStat || !currentQuestion || selectedReasoning === null) return;
    const { points: estimatePoints, label, percentOff } = scoreEstimate(guess, currentStat.value_1k);
    const quality = getReasoningQuality(currentQuestion.reasoningOptions!, selectedReasoning);
    const reasoningPoints = scoreReasoning(quality);
    const total = estimatePoints + reasoningPoints;
    setLastResult({
      estimatePoints,
      reasoningPoints,
      scoreLabel: label,
      percentOff,
      reasoningFeedback: getReasoningFeedback(quality),
      stat: currentStat,
      userGuess: guess,
    });
    setSessionScore((s) => s + total);
    setQuestionsAnswered((q) => q + 1);
    addScore('mechanic2', total);
    setPhase('revealed');
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      setPhase('done');
    } else {
      setCurrentIndex(nextIndex);
      setGuess(100);
      setSelectedReasoning(null);
      setPhase('estimate');
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
        <div className="text-6xl">🧠</div>
        <h2 className="text-3xl font-bold text-slate-800">Session Complete!</h2>
        <p className="text-slate-600">You answered all {questionsAnswered} questions.</p>
        <p className="text-4xl font-bold text-emerald-600">{sessionScore.toLocaleString()} pts</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button onClick={() => { setCurrentIndex(0); setGuess(100); setSelectedReasoning(null); setSessionScore(0); setQuestionsAnswered(0); setPhase('estimate'); setQuestions(getExplainQuestions(getShuffledQuestions())); }}>
            Play Again
          </Button>
          <Link href="/"><Button variant="secondary">Home</Button></Link>
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
          <h1 className="text-xl font-bold text-slate-800 mt-0.5">WorldEstimation</h1>
        </div>
        <ScoreBadge score={sessionScore} questionsAnswered={questionsAnswered} />
      </div>

      {/* Phase indicator */}
      <div className="flex gap-2 text-xs">
        {(['estimate', 'hint', 'reasoning', 'revealed'] as const).map((p, i) => (
          <div key={p} className="flex items-center gap-2">
            {i > 0 && <span className="text-slate-300">→</span>}
            <span className={`font-medium ${phase === p ? 'text-emerald-600' : 'text-slate-400'}`}>
              {p === 'estimate' ? 'Guess' : p === 'hint' ? 'Refine' : p === 'reasoning' ? 'Explain' : 'Reveal'}
            </span>
          </div>
        ))}
      </div>

      {/* Estimate phase — no hint shown */}
      {phase === 'estimate' && currentQuestion && currentStat && (
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

      {/* Hint phase — hint revealed, player can refine before picking reasoning */}
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

            {currentQuestion.hint && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Hint</p>
                <p className="text-sm text-amber-900 leading-relaxed">{currentQuestion.hint}</p>
              </div>
            )}

            <EstimateInput value={guess} onChange={setGuess} max={1000} unit="out of 1,000 people" />
            <Button size="lg" className="w-full" onClick={handleHintSubmit}>
              Lock in Estimate →
            </Button>
          </div>
        </Card>
      )}

      {/* Reasoning phase */}
      {phase === 'reasoning' && currentQuestion && (
        <Card>
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-sm text-slate-500">Your estimate</p>
              <p className="text-3xl font-bold text-slate-800">{guess} people</p>
            </div>

            <ReasoningSelector
              options={currentQuestion.reasoningOptions!}
              selected={selectedReasoning}
              onSelect={setSelectedReasoning}
            />

            <Button
              size="lg"
              className="w-full"
              disabled={selectedReasoning === null}
              onClick={handleReasoningSubmit}
            >
              Reveal the Answer →
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
              points={lastResult.estimatePoints + lastResult.reasoningPoints}
              scoreLabel={lastResult.scoreLabel}
              percentOff={lastResult.percentOff}
            />

            {/* Reasoning breakdown */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-1">
              <p className="font-semibold text-blue-800 text-sm">Reasoning bonus</p>
              <p className="text-blue-900 text-sm">{lastResult.reasoningFeedback}</p>
              <p className="text-blue-700 text-sm font-medium mt-1">
                +{lastResult.reasoningPoints} pts for reasoning
                {' · '}+{lastResult.estimatePoints} pts for accuracy
              </p>
            </div>

            <Button size="lg" className="w-full" onClick={handleNext}>
              Next Question →
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
