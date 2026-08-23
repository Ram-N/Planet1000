export type Domain =
  | 'people'
  | 'food'
  | 'water'
  | 'energy'
  | 'housing'
  | 'healthcare'
  | 'education'
  | 'money'
  | 'environment'
  | 'transportation';

export type Dimension =
  | 'how many'
  | 'how much'
  | 'per person'
  | 'rate'
  | 'distribution';

export interface WorldStat {
  id: string;
  domain: Domain;
  dimension: Dimension;
  label: string;
  value_1k: number;
  value_world: number;
  unit: string;
  explanation: string;
}

export interface Question {
  id: string;
  statId: string;
  prompt: string;
  hint?: string;
  reasoningOptions?: string[];
}

export interface ChainQuestion {
  id: string;
  statId: string;
  prompt: string;
  hint?: string;
  followUpIntro?: string; // text shown before next question in chain
}

export interface QuestionChain {
  id: string;
  title: string;
  topic: string;
  questions: ChainQuestion[];
}

export type ReasoningQuality = 'strong' | 'moderate' | 'weak';

export interface ReasoningOption {
  id: string;
  label: string;
  quality: ReasoningQuality;
}

export interface GameSession {
  score: number;
  questionsAnswered: number;
  streak: number;
  date: string;
}

export interface BoxSegment {
  id: string;
  label: string;
  value: number; // out of 1000
  color: string;
  children?: BoxSegment[];
}

export interface SplitStep {
  id: string;
  question: string;
  parentSegmentId: string | null;
  splitLabel: [string, string]; // [left label, right label]
  correctSplit: [number, number]; // [left value, right value] out of parent
  explanation: string;
}

export interface DailyProgress {
  dayIndex: number;
  chainId: string;
  completedQuestions: number[];
  answers: Record<number, number>;
  completed: boolean;
}

export interface UserStats {
  totalScore: number;
  totalQuestions: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string;
  mechanic1Score: number;
  mechanic2Score: number;
  mechanic4Score: number;
}
