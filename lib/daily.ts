import chainsData from '@/data/chains.json';
import type { QuestionChain, DailyProgress } from '@/types';

const chains = chainsData as QuestionChain[];

const STORAGE_KEY = 'planet1000_daily';

export function getTodayIndex(): number {
  return Math.floor(Date.now() / 86400000);
}

export function getTodayChain(): QuestionChain {
  const dayIndex = getTodayIndex();
  return chains[dayIndex % chains.length];
}

export function loadDailyProgress(): DailyProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const progress = JSON.parse(raw) as DailyProgress;
    // Stale if it's from a different day
    if (progress.dayIndex !== getTodayIndex()) return null;
    return progress;
  } catch {
    return null;
  }
}

export function saveDailyProgress(progress: DailyProgress): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function createFreshProgress(chain: QuestionChain): DailyProgress {
  return {
    dayIndex: getTodayIndex(),
    chainId: chain.id,
    completedQuestions: [],
    answers: {},
    completed: false,
  };
}

export function getAllChains(): QuestionChain[] {
  return chains;
}
