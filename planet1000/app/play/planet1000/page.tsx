'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { EstimateInput } from '@/components/EstimateInput';
import { ScoreBadge } from '@/components/ScoreBadge';
import { SummaryArtifact } from '@/components/SummaryArtifact';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getCurrentWeeklyPuzzle, getSummaryById } from '@/lib/puzzle-loader';
import { scoreEstimate } from '@/lib/scoring';
import { addScore } from '@/lib/stats';
import type { WeeklyPuzzle, KnowledgeSummary } from '@/types/puzzle';

// ─── Phase type ───────────────────────────────────────────────────────────────
// estimate     → Guess 1 (cold)
// relationship → Hint 1 shown (comparative context); Guess 2
// temporal     → Hint 2 shown (trend over time); Guess 3
// scale        → Hint 3 shown (concrete scale number); Guess 4
// revealed     → Final answer + score + summary artifact
type Phase = 'estimate' | 'relationship' | 'temporal' | 'scale' | 'revealed';

const GUESS_PHASES: Phase[] = ['estimate', 'relationship', 'temporal', 'scale'];

const HINT_META: Record<Exclude<Phase, 'estimate' | 'revealed'>, { heading: string; label: string }> = {
  relationship: { heading: 'Relationship', label: 'How it compares' },
  temporal:     { heading: 'Time Trend',   label: 'How it has changed' },
  scale:        { heading: 'Scale', label: 'A concrete reference' },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Planet1000Page() {
  const [puzzle, setPuzzle]   = useState<WeeklyPuzzle | null>(null);
  const [artifact, setArtifact] = useState<KnowledgeSummary | null>(null);
  const [phase, setPhase]     = useState<Phase>('estimate');

  // Four guess values
  const [guess1, setGuess1] = useState(100);
  const [guess2, setGuess2] = useState(100);
  const [guess3, setGuess3] = useState(100);
  const [guess4, setGuess4] = useState(100);

  // Per-guess points
  const [pts1, setPts1] = useState(0);
  const [pts2, setPts2] = useState(0);
  const [pts3, setPts3] = useState(0);
  const [pts4, setPts4] = useState(0);

  useEffect(() => {
    const p = getCurrentWeeklyPuzzle();
    setPuzzle(p);
    const a = getSummaryById(p.summary_id);
    setArtifact(a);
  }, []);

  if (!puzzle) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-slate-500">
        Loading this week's puzzle…
      </div>
    );
  }

  const actual = puzzle.answer_value_1k;
  const total  = pts1 + pts2 + pts3 + pts4;

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleEstimate() {
    const { points } = scoreEstimate(guess1, actual, 1);
    setPts1(points);
    setGuess2(guess1);
    setPhase('relationship');
  }

  function handleRelationship() {
    const { points } = scoreEstimate(guess2, actual, 2);
    setPts2(points);
    setGuess3(guess2);
    setPhase('temporal');
  }

  function handleTemporal() {
    const { points } = scoreEstimate(guess3, actual, 3);
    setPts3(points);
    setGuess4(guess3);
    setPhase('scale');
  }

  function handleAnchor() {
    const { points } = scoreEstimate(guess4, actual, 4);
    setPts4(points);
    const questionTotal = pts1 + pts2 + pts3 + points;
    addScore('mechanic1', questionTotal);
    setPhase('revealed');
  }

  // ── Progress bar ─────────────────────────────────────────────────────────────

  const phaseIndex = GUESS_PHASES.indexOf(phase);

  // ── Main layout ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">← Home</Link>
          <h1 className="text-xl font-bold text-slate-800 mt-0.5">Planet 1000</h1>
        </div>
        {phase === 'revealed' && (
          <ScoreBadge score={total} questionsAnswered={1} />
        )}
      </div>

      {/* 4-segment guess progress bar */}
      {phase !== 'revealed' && (
        <div className="flex gap-2">
          {([
            { guess: 'Guess 1', hint: 'No hints yet'       },
            { guess: 'Guess 2', hint: 'How it compares'    },
            { guess: 'Guess 3', hint: 'How it has changed' },
            { guess: 'Guess 4', hint: 'Concrete scale'     },
          ] as const).map(({ guess, hint }, i) => {
            const isDone    = phaseIndex > i;
            const isCurrent = phaseIndex === i;
            const color = isDone ? 'text-emerald-600' : isCurrent ? 'text-blue-600' : 'text-slate-300';
            return (
              <div key={guess} className="flex-1 space-y-1">
                <div className={[
                  'h-2.5 rounded-full transition-colors duration-300',
                  isDone    ? 'bg-emerald-500' :
                  isCurrent ? 'bg-blue-500'    :
                              'bg-slate-200',
                ].join(' ')} />
                <p className={`text-xs text-center font-semibold ${color}`}>{guess}</p>
                <p className={`text-xs text-center ${color} opacity-70`}>{hint}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Domain badge */}
      {phase !== 'revealed' && (
        <p className="text-xs uppercase tracking-wide text-slate-400">
          {puzzle.domain}
        </p>
      )}

      <AnimatePresence mode="wait">

        {/* ── ESTIMATE (Guess 1) ─────────────────────────────────────────────── */}
        {phase === 'estimate' && (
          <motion.div key="estimate" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card>
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-800 leading-snug">{puzzle.question}</h2>
                <EstimateInput value={guess1} onChange={setGuess1} max={1000} unit="out of 1,000 people" />
                <Button size="lg" className="w-full" onClick={handleEstimate}>
                  Make your estimate →
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── RELATIONSHIP HINT (Guess 2) ────────────────────────────────────── */}
        {phase === 'relationship' && (
          <motion.div key="relationship" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card>
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-800 leading-snug">{puzzle.question}</h2>
                <HintBox
                  heading={HINT_META.relationship.heading}
                  fact={puzzle.relationship_fact.text}
                  sourceLabel={puzzle.relationship_fact.source_label}
                  sourceUrl={puzzle.relationship_fact.source_url}
                />
                <EstimateInput value={guess2} onChange={setGuess2} max={1000} unit="out of 1,000 people" />
                <Button size="lg" className="w-full" onClick={handleRelationship}>
                  Refine your estimate →
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── TEMPORAL HINT (Guess 3) ────────────────────────────────────────── */}
        {phase === 'temporal' && (
          <motion.div key="temporal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card>
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-800 leading-snug">{puzzle.question}</h2>
                <HintBox
                  heading={HINT_META.temporal.heading}
                  fact={puzzle.temporal_fact.text}
                  sourceLabel={puzzle.temporal_fact.source_label}
                  sourceUrl={puzzle.temporal_fact.source_url}
                />
                <EstimateInput value={guess3} onChange={setGuess3} max={1000} unit="out of 1,000 people" />
                <Button size="lg" className="w-full" onClick={handleTemporal}>
                  Narrow it down →
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── ANCHOR HINT (Guess 4) ──────────────────────────────────────────── */}
        {phase === 'scale' && (
          <motion.div key="scale" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card>
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-800 leading-snug">{puzzle.question}</h2>
                <HintBox
                  heading={HINT_META.scale.heading}
                  fact={puzzle.scale_fact.text}
                  sourceLabel={puzzle.scale_fact.source_label}
                  sourceUrl={puzzle.scale_fact.source_url}
                />
                <EstimateInput value={guess4} onChange={setGuess4} max={1000} unit="out of 1,000 people" />
                <Button size="lg" className="w-full" onClick={handleAnchor}>
                  Final answer →
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── REVEALED ──────────────────────────────────────────────────────── */}
        {phase === 'revealed' && (
          <motion.div key="revealed" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <RevealContent
                puzzle={puzzle}
                guesses={[guess1, guess2, guess3, guess4]}
                points={[pts1, pts2, pts3, pts4]}
              />
            </Card>

            {artifact && (
              <div className="mt-4">
                <Card>
                  <SummaryArtifact artifact={artifact} />
                </Card>
              </div>
            )}

            <div className="mt-4 flex gap-3 justify-center flex-wrap">
              <Link href="/"><Button variant="secondary">Home</Button></Link>
              <Link href="/stats"><Button variant="ghost">View Stats</Button></Link>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function HintBox({
  heading,
  fact,
  sourceLabel,
  sourceUrl,
}: {
  heading: string;
  fact: string;
  sourceLabel?: string;
  sourceUrl?: string;
}) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-2">
      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">{heading}</p>
      <p className="text-sm text-amber-900 leading-relaxed">{fact}</p>
      {sourceLabel && (
        <p className="text-xs text-amber-600">
          Source:{' '}
          {sourceUrl ? (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-800">
              {sourceLabel} ↗
            </a>
          ) : (
            sourceLabel
          )}
        </p>
      )}
    </div>
  );
}

function RevealContent({
  puzzle,
  guesses,
  points,
}: {
  puzzle: WeeklyPuzzle;
  guesses: [number, number, number, number];
  points: [number, number, number, number];
}) {
  const actual    = puzzle.answer_value_1k;
  const total     = points.reduce((s, p) => s + p, 0);
  const finalGuess = guesses[3];
  const percentOff = actual === 0 ? 0 : Math.abs(finalGuess - actual) / actual;
  const guessWidth  = Math.min(100, (finalGuess / 1000) * 100);
  const actualWidth = Math.min(100, (actual / 1000) * 100);

  const maxLabels = ['Guess 1 (cold)', 'After hint 1', 'After hint 2', 'After hint 3'];
  const maxPts    = [100, 75, 50, 25];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      {/* Answer */}
      <div className="text-center space-y-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">The answer</p>
        <p className="text-4xl font-bold text-slate-800">
          {actual} / 1,000
        </p>
        <p className="text-sm text-slate-500">{puzzle.answer_unit}</p>
      </div>

      {/* Total score */}
      <div className="text-center">
        <p className="text-5xl font-bold text-emerald-600">+{total}</p>
        <p className="text-sm text-slate-500 mt-1">
          {percentOff === 0 ? 'Exact on your final guess!' : `${Math.round(percentOff * 100)}% off (final guess)`}
        </p>
      </div>

      {/* Comparison bars */}
      <div className="space-y-3 bg-slate-50 rounded-2xl p-4">
        <Bar label="Your final guess" value={finalGuess} width={guessWidth} unit={puzzle.answer_unit} color="bg-blue-400" delay={0.2} />
        <Bar label="Actual answer"    value={actual}     width={actualWidth} unit={puzzle.answer_unit} color="bg-emerald-500" delay={0.4} />
      </div>

      {/* Score breakdown */}
      <div className="bg-slate-50 rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Score breakdown</p>
        <div className="flex gap-2 text-sm flex-wrap">
          {points.map((pts, i) => (
            <BreakdownPill key={i} label={maxLabels[i]} pts={pts} max={maxPts[i]} />
          ))}
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
        <h4 className="font-semibold text-emerald-800 mb-1">What does that mean?</h4>
        <p className="text-emerald-900 text-sm leading-relaxed">{puzzle.answer_explanation}</p>
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
