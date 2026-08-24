'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { WorldBox, getSegmentColor, type Segment } from '@/components/WorldBox';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface SplitStep {
  question: string;
  hint: string;
  explanation: string;
  // Describes how the FIRST segment (index 0) gets split
  targetSegmentIndex: number;
  leftLabel: string;
  rightLabel: string;
  leftValue: number;   // out of the parent segment's value
  rightValue: number;  // parent.value = leftValue + rightValue
}

// Curated sequence: each step splits one existing segment
const STEPS: SplitStep[] = [
  {
    question: 'Drag to divide the world into children (under 15) and adults.',
    hint: 'About 1 in 4 people globally is under 15.',
    explanation: '257 out of 1,000 people are children under 15 — nearly one in four. This reflects high birth rates in Africa and South Asia.',
    targetSegmentIndex: 0,
    leftLabel: 'Children',
    rightLabel: 'Adults',
    leftValue: 257,
    rightValue: 743,
  },
  {
    question: 'Of the 743 adults, how many live in cities vs. rural areas?',
    hint: 'More than half of humanity lives in cities — but many are adults.',
    explanation: 'About 380 of the 743 adults live in urban areas. Cities contain slightly fewer children proportionally due to rural populations having higher birth rates.',
    targetSegmentIndex: 1, // split "Adults"
    leftLabel: 'Urban Adults',
    rightLabel: 'Rural Adults',
    leftValue: 380,
    rightValue: 363,
  },
  {
    question: 'Of the 743 adults, how many are employed?',
    hint: 'Global employment rate is around 55% of working-age adults.',
    explanation: 'About 409 of our 1,000 people are employed. This includes formal and informal work — from factory workers to subsistence farmers.',
    targetSegmentIndex: 2, // split "Rural Adults"
    leftLabel: 'Employed Rural',
    rightLabel: 'Not Employed Rural',
    leftValue: 200,
    rightValue: 163,
  },
  {
    question: 'How many of our 1,000 people live in extreme poverty (under $2.15/day)?',
    hint: 'Extreme poverty is concentrated but still affects nearly 1 in 10 people globally.',
    explanation: '87 of our 1,000 people live in extreme poverty — mostly in rural sub-Saharan Africa and South Asia. Poverty has fallen dramatically but remains stubborn in these regions.',
    targetSegmentIndex: 4, // split "Not Employed Rural"
    leftLabel: 'Extreme Poverty',
    rightLabel: 'Rural Not Employed, Above Poverty',
    leftValue: 50,
    rightValue: 113,
  },
  {
    question: 'How many of our 1,000 people have no access to electricity?',
    hint: 'Electrification has progressed but remains incomplete, especially in rural areas.',
    explanation: '73 of our 1,000 people live without electricity. Nearly all of them are in rural areas — especially rural sub-Saharan Africa and parts of South Asia.',
    targetSegmentIndex: 4, // split "Extreme Poverty"
    leftLabel: 'No Electricity',
    rightLabel: 'Extreme Poverty w/ Electricity',
    leftValue: 40,
    rightValue: 10,
  },
];

function buildInitialSegments(): Segment[] {
  return [{ label: 'All People', value: 1000, color: 'bg-slate-400', textColor: 'text-white' }];
}

function applyStep(segments: Segment[], step: SplitStep, colorIndex: number): Segment[] {
  const next = [...segments];
  const target = next[step.targetSegmentIndex];
  if (!target) return next;

  const leftColor = getSegmentColor(colorIndex);
  const rightColor = getSegmentColor(colorIndex + 1);

  const leftSeg: Segment = {
    label: step.leftLabel,
    value: step.leftValue,
    color: leftColor.bg,
    textColor: leftColor.text,
  };
  const rightSeg: Segment = {
    label: step.rightLabel,
    value: step.rightValue,
    color: rightColor.bg,
    textColor: rightColor.text,
  };

  // Replace target with the two new segments
  next.splice(step.targetSegmentIndex, 1, leftSeg, rightSeg);
  return next;
}

export default function WorldInABoxPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<'question' | 'revealed' | 'done'>('question');
  const [segments, setSegments] = useState<Segment[]>(buildInitialSegments());
  const [sliderValue, setSliderValue] = useState(500);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const handleReveal = () => {
    const colorIndex = stepIndex * 2;
    const nextSegments = applyStep(segments, step, colorIndex);
    setSegments(nextSegments);
    setPhase('revealed');
  };

  const handleNext = () => {
    if (isLast) {
      setPhase('done');
    } else {
      setStepIndex((i) => i + 1);
      setSliderValue(500);
      setPhase('question');
    }
  };

  const handleRestart = () => {
    setStepIndex(0);
    setPhase('question');
    setSegments(buildInitialSegments());
    setSliderValue(500);
  };

  // Derive guess segments for preview
  const targetValue = segments[step?.targetSegmentIndex]?.value ?? 1000;
  const guessLeft = Math.round((sliderValue / 1000) * targetValue);
  const guessRight = targetValue - guessLeft;

  if (phase === 'done') {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div>
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">← Home</Link>
          <h1 className="text-xl font-bold text-slate-800 mt-0.5">The World in a Box</h1>
        </div>
        <Card>
          <div className="space-y-6 text-center">
            <h2 className="text-2xl font-bold text-slate-800">Your World, Complete</h2>
            <p className="text-slate-600">Here is what our 1,000-person world actually looks like:</p>
            <WorldBox segments={segments} />
            <p className="text-sm text-slate-500">
              Every segment is drawn to scale from real global data. How close was your intuition?
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button onClick={handleRestart}>Play Again</Button>
              <Link href="/"><Button variant="secondary">Home</Button></Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">← Home</Link>
          <h1 className="text-xl font-bold text-slate-800 mt-0.5">The World in a Box</h1>
        </div>
        <span className="text-sm text-slate-500">Step {stepIndex + 1} of {STEPS.length}</span>
      </div>

      {/* Current world state */}
      <Card variant="muted">
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Current world</p>
        <WorldBox segments={segments} />
      </Card>

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex + phase}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
        >
          {phase === 'question' && step && (
            <Card>
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 leading-snug">
                    {step.question}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1 italic">{step.hint}</p>
                </div>

                {/* Slider to split */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-medium text-slate-600">
                    <span>{step.leftLabel}: <strong>{guessLeft}</strong></span>
                    <span>{step.rightLabel}: <strong>{guessRight}</strong></span>
                  </div>

                  {/* Visual preview */}
                  <div className="w-full h-10 rounded-lg overflow-hidden flex border border-slate-200">
                    <motion.div
                      className="bg-emerald-400 flex items-center justify-center"
                      animate={{ width: `${(guessLeft / targetValue) * 100}%` }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                      {guessLeft > targetValue * 0.15 && (
                        <span className="text-xs text-white font-bold">{guessLeft}</span>
                      )}
                    </motion.div>
                    <motion.div
                      className="bg-blue-400 flex items-center justify-center"
                      animate={{ width: `${(guessRight / targetValue) * 100}%` }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                      {guessRight > targetValue * 0.15 && (
                        <span className="text-xs text-white font-bold">{guessRight}</span>
                      )}
                    </motion.div>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={1000}
                    value={sliderValue}
                    onChange={(e) => setSliderValue(Number(e.target.value))}
                    className="w-full h-3 rounded-full appearance-none cursor-pointer bg-slate-200"
                  />
                </div>

                <Button size="lg" className="w-full" onClick={handleReveal}>
                  Reveal the Split →
                </Button>
              </div>
            </Card>
          )}

          {phase === 'revealed' && step && (
            <Card>
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-1">Actual split</p>
                  <p className="text-lg font-bold text-slate-800">
                    {step.leftLabel}: <span className="text-emerald-600">{step.leftValue}</span>
                    {' · '}
                    {step.rightLabel}: <span className="text-blue-600">{step.rightValue}</span>
                  </p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-sm text-emerald-900 leading-relaxed">{step.explanation}</p>
                </div>

                <Button size="lg" className="w-full" onClick={handleNext}>
                  {isLast ? 'See Final World →' : 'Next Split →'}
                </Button>
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
