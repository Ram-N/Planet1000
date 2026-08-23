import type { UserStats } from '@/types';

const STORAGE_KEY = 'planet1000_stats';

export function loadUserStats(): UserStats {
  if (typeof window === 'undefined') return defaultStats();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats();
    return JSON.parse(raw) as UserStats;
  } catch {
    return defaultStats();
  }
}

export function saveUserStats(stats: UserStats): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function addScore(
  mechanic: 'mechanic1' | 'mechanic2' | 'mechanic4',
  points: number
): void {
  const stats = loadUserStats();
  stats.totalScore += points;
  stats.totalQuestions += 1;
  if (mechanic === 'mechanic1') stats.mechanic1Score += points;
  if (mechanic === 'mechanic2') stats.mechanic2Score += points;
  if (mechanic === 'mechanic4') stats.mechanic4Score += points;

  const today = new Date().toISOString().split('T')[0];
  if (stats.lastPlayedDate === today) {
    stats.currentStreak = Math.max(stats.currentStreak, 1);
  } else {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (stats.lastPlayedDate === yesterday) {
      stats.currentStreak += 1;
    } else {
      stats.currentStreak = 1;
    }
    stats.lastPlayedDate = today;
  }
  stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
  saveUserStats(stats);
}

function defaultStats(): UserStats {
  return {
    totalScore: 0,
    totalQuestions: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastPlayedDate: '',
    mechanic1Score: 0,
    mechanic2Score: 0,
    mechanic4Score: 0,
  };
}
