import questionsData from '@/data/questions.json';
import statsData from '@/data/stats.json';
import type { Question, WorldStat } from '@/types';

const questions = questionsData as Question[];
const stats = statsData as WorldStat[];

export function getAllQuestions(): Question[] {
  return questions;
}

export function getStatById(id: string): WorldStat | undefined {
  return stats.find((s) => s.id === id);
}

export function getQuestionWithStat(
  questionId: string
): { question: Question; stat: WorldStat } | null {
  const question = questions.find((q) => q.id === questionId);
  if (!question) return null;
  const stat = stats.find((s) => s.id === question.statId);
  if (!stat) return null;
  return { question, stat };
}

/** Fisher-Yates shuffle — returns a new shuffled array */
export function shuffleQuestions(qs: Question[]): Question[] {
  const arr = [...qs];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getShuffledQuestions(): Question[] {
  return shuffleQuestions(questions);
}
