'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { EstimateInput } from '@/components/EstimateInput';
import { ScoreBadge } from '@/components/ScoreBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getDailyQuestions, getStatById } from '@/lib/questions';
import { scoreEstimate } from '@/lib/scoring';
import { selectHint, type HintResponse } from '@/lib/hint-engine';
import { addScore } from '@/lib/stats';
import type { Question, WorldStat } from '@/types';

// ─── Phase type ──────────────────────────────────────────────────────────────
// estimate  → player makes first cold guess
// think     → hint 1 shown (facts, no direction); player refines to guess 2
// refine    → hint 2 shown (direction + fact); player commits to guess 3
// revealed  → answer shown with score breakdown
// done      → all 3 questions complete
type Phase = 'estimate' | 'think' | 'refine' | 'revealed' | 'done';

const PHASE_LABELS: Record<Exclude<Phase, 'done'>, string> = {
  estimate: 'Estimate',
  think:    'Think',
  refine:   'Refine',
  revealed: 'Reveal',
};

const PHASE_ORDER: Exclude<Phase, 'done'>[] = ['estimate', 'think', 'refine', 'revealed'];

// ─── Component ───────────────────────────────────────────────────────────────
export default function Planet1000Page() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex]       = useState(0);
  const [phase, setPhase]         = useState<Phase>('estimate');

  // Three guess values — each phase has its own slider
  const [guess1, setGuess1] = useState(100);
  const [guess2, setGuess2] = useState(100);
  const [guess3, setGuess3] = useState(100);

  // Hints computed after each submission
  const [hint1, setHint1] = useState<HintResponse | null>(null);
  const [hint2, setHint2] = useState<HintResponse | null>(null);

  // Per-attempt points for the current question
  const [pts1, setPts1] = useState(0);
  const [pts2, setPts2] = useState(0);
  const [pts3, setPts3] = useState(0);

  // Session totals
  const [sessionScore, setSessionScore]       = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);

  // Resolved stat for the current question (for reveal)
  const [currentStat, setCurrentStat] = useState<WorldStat | undefined>(undefined);

  useEffect(() => {
    setQuestions(getDailyQuestions(1));
  }, []);

  const currentQuestion = questions[qIndex];

  // Resolve stat whenever the question changes
  useEffect(() => {
    if (currentQuestion) {
      setCurrentStat(getStatById(currentQuestion.statId));
    }
  }, [currentQuestion]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function resetQuestionState() {
    setGuess1(100);
    setGuess2(100);
    setGuess3(100);
    setHint1(null);
    setHint2(null);
    setPts1(0);
    setPts2(0);
    setPts3(0);
  }

  function handleEstimate() {
    if (!currentStat || !currentQuestion) return;
    const { points } = scoreEstimate(guess1, currentStat.value_1k, 1);
    setPts1(points);
    const h1 = selectHint(guess1, currentStat.value_1k, currentQuestion.facts ?? [], 1, []);
    setHint1(h1);
    setGuess2(guess1); // seed guess2 from guess1 so the slider position carries over
    setPhase('think');
  }

  function handleThink() {
    if (!currentStat || !currentQuestion) return;
    const { points } = scoreEstimate(guess2, currentStat.value_1k, 2);
    setPts2(points);
    const usedSoFar = hint1?.selectedIndices ?? [];
    const h2 = selectHint(guess2, currentStat.value_1k, currentQuestion.facts ?? [], 2, usedSoFar);
    setHint2(h2);
    setGuess3(guess2); // seed guess3 from guess2
    setPhase('refine');
  }

  function handleRefine() {
    if (!currentStat) return;
    const { points } = scoreEstimate(guess3, currentStat.value_1k, 3);
    setPts3(points);
    const questionTotal = pts1 + pts2 + points;
    setSessionScore((s) => s + questionTotal);
    setQuestionsAnswered((q) => q + 1);
    addScore('mechanic1', questionTotal);
    setPhase('revealed');
  }

  function handleNext() {
    const nextIndex = qIndex + 1;
    if (nextIndex >= questions.length) {
      setPhase('done');
    } else {
      setQIndex(nextIndex);
      resetQuestionState();
      setPhase('estimate');
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-slate-500">
        Loading today's questions…
      </div>
    );
  }

  // ── Done screen ────────────────────────────────────────────────────────────

  if (phase === 'done') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="text-6xl">🎉</div>
        <h2 className="text-3xl font-bold text-slate-800">Daily Complete!</h2>
        <p className="text-slate-600">You answered all {questionsAnswered} questions.</p>
        <p className="text-4xl font-bold text-emerald-600">{sessionScore.toLocaleString()} pts</p>
        <p className="text-sm text-slate-400">Max possible: {(questions.length * 155).toLocaleString()} pts</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/"><Button variant="secondary">Home</Button></Link>
          <Link href="/stats"><Button variant="ghost">View Stats</Button></Link>
        </div>
      </div>
    );
  }

  if (!currentQuestion || !currentStat) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-slate-500">
        Loading…
      </div>
    );
  }

  const actual = currentStat.value_1k;

  // ── Main layout ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">← Home</Link>
          <h1 className="text-xl font-bold text-slate-800 mt-0.5">Planet1000</h1>
        </div>
        <ScoreBadge score={sessionScore} questionsAnswered={questionsAnswered} />
      </div>

      {/* Question tracker chips */}
      <div className="flex items-center gap-2">
        {questions.map((_, i) => {
          const isDone   = i < qIndex || (i === qIndex && phase === 'revealed');
          const isCurrent = i === qIndex && phase !== 'revealed';
          return (
            <div
              key={i}
              className={[
                'h-2.5 flex-1 rounded-full transition-colors',
                isDone   ? 'bg-emerald-500' :
                isCurrent ? 'bg-blue-500'    :
                            'bg-slate-200',
              ].join(' ')}
            />
          );
        })}
        <span className="text-xs text-slate-400 ml-1">
          Q{qIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Phase step labels */}
      {phase !== 'revealed' && (
        <div className="flex items-center gap-1 text-xs">
          {PHASE_ORDER.map((p, i) => {
            const currentPhaseIndex = PHASE_ORDER.indexOf(phase as Exclude<Phase, 'done'>);
            const isPast    = i < currentPhaseIndex;
            const isCurrent = i === currentPhaseIndex;
            return (
              <span key={p} className="flex items-center gap-1">
                {i > 0 && <span className="text-slate-300">→</span>}
                <span className={[
                  'font-semibold uppercase tracking-wide',
                  isCurrent ? 'text-blue-600' :
                  isPast    ? 'text-emerald-600' :
                              'text-slate-300',
                ].join(' ')}>
                  {PHASE_LABELS[p]}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* ── ESTIMATE phase ─────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {phase === 'estimate' && (
          <motion.div key="estimate" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card>
              <div className="space-y-6">
                <QuestionHeader stat={currentStat} prompt={currentQuestion.prompt} />
                <EstimateInput value={guess1} onChange={setGuess1} max={1000} unit="out of 1,000 people" />
                <Button size="lg" className="w-full" onClick={handleEstimate}>
                  Make your estimate →
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── THINK phase ──────────────────────────────────────────────────── */}
        {phase === 'think' && hint1 && (
          <motion.div key="think" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card>
              <div className="space-y-6">
                <QuestionHeader stat={currentStat} prompt={currentQuestion.prompt} />
                <HintBox heading="Think about this…" preamble={null} facts={hint1.facts} />
                <EstimateInput value={guess2} onChange={setGuess2} max={1000} unit="out of 1,000 people" />
                <Button size="lg" className="w-full" onClick={handleThink}>
                  Refine your estimate →
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── REFINE phase ─────────────────────────────────────────────────── */}
        {phase === 'refine' && hint2 && (
          <motion.div key="refine" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card>
              <div className="space-y-6">
                <QuestionHeader stat={currentStat} prompt={currentQuestion.prompt} />
                <HintBox heading="Getting warmer…" preamble={hint2.preamble} facts={hint2.facts} />
                <EstimateInput value={guess3} onChange={setGuess3} max={1000} unit="out of 1,000 people" />
                <Button size="lg" className="w-full" onClick={handleRefine}>
                  Final answer →
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── REVEALED phase ───────────────────────────────────────────────── */}
        {phase === 'revealed' && (
          <motion.div key="revealed" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <div className="space-y-6">
                <RevealContent
                  stat={currentStat}
                  guess3={guess3}
                  pts1={pts1}
                  pts2={pts2}
                  pts3={pts3}
                />
                <Button size="lg" className="w-full" onClick={handleNext}>
                  {qIndex + 1 < questions.length ? 'Next Question →' : 'See Results →'}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuestionHeader({ stat, prompt }: { stat: WorldStat; prompt: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
        {stat.domain} · {stat.dimension}
      </p>
      <h2 className="text-xl font-semibold text-slate-800 leading-snug">{prompt}</h2>
    </div>
  );
}

function HintBox({
  heading,
  preamble,
  facts,
}: {
  heading: string;
  preamble: string | null;
  facts: string[];
}) {
  if (!preamble && facts.length === 0) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-2">
      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">{heading}</p>
      {preamble && (
        <p className="text-sm font-medium text-amber-900">{preamble}</p>
      )}
      {facts.map((f, i) => (
        <p key={i} className="text-sm text-amber-900 leading-relaxed">{f}</p>
      ))}
    </div>
  );
}

function RevealContent({
  stat,
  guess3,
  pts1,
  pts2,
  pts3,
}: {
  stat: WorldStat;
  guess3: number;
  pts1: number;
  pts2: number;
  pts3: number;
}) {
  const actual     = stat.value_1k;
  const total      = pts1 + pts2 + pts3;
  const guessWidth = Math.min(100, (guess3 / 1000) * 100);
  const actualWidth = Math.min(100, (actual / 1000) * 100);
  const percentOff = actual === 0 ? 0 : Math.abs(guess3 - actual) / actual;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      {/* Total score */}
      <div className="text-center">
        <p className="text-5xl font-bold text-emerald-600">+{total}</p>
        <p className="text-sm text-slate-500 mt-1">
          {percentOff === 0 ? 'Exact!' : `${Math.round(percentOff * 100)}% off (final guess)`}
        </p>
      </div>

      {/* Comparison bars */}
      <div className="space-y-3 bg-slate-50 rounded-2xl p-4">
        <Bar label="Your final guess" value={guess3} width={guessWidth} unit={stat.unit} color="bg-blue-400" delay={0.2} />
        <Bar label="Actual answer"    value={actual}  width={actualWidth} unit={stat.unit} color="bg-emerald-500" delay={0.4} />
      </div>

      {/* Score breakdown */}
      <div className="bg-slate-50 rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Score breakdown</p>
        <div className="flex gap-3 text-sm flex-wrap">
          <BreakdownPill label="Cold" pts={pts1} max={100} />
          <BreakdownPill label="After hint 1" pts={pts2} max={40} />
          <BreakdownPill label="After hint 2" pts={pts3} max={15} />
        </div>
      </div>

      {/* Did you know */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
        <h4 className="font-semibold text-emerald-800 mb-1">Did you know?</h4>
        <p className="text-emerald-900 text-sm leading-relaxed">{stat.explanation}</p>
      </div>
    </motion.div>
  );
}

function Bar({
  label, value, width, unit, color, delay,
}: {
  label: string; value: number; width: number; unit: string; color: string; delay: number;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-bold text-slate-800">{value} {unit}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
        <motion.div
          className={`${color} h-full rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.6, delay }}
        />
      </div>
    </div>
  );
}

function BreakdownPill({ label, pts, max }: { label: string; pts: number; max: number }) {
  const earned = pts > 0;
  return (
    <span className={[
      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
      earned ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400',
    ].join(' ')}>
      <span className="font-bold">+{pts}</span>
      <span>{label}</span>
      <span className="opacity-60">/ {max}</span>
    </span>
  );
}
