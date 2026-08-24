'use client';

interface ScoreBadgeProps {
  score: number;
  questionsAnswered: number;
}

export function ScoreBadge({ score, questionsAnswered }: ScoreBadgeProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-xs text-slate-500 uppercase tracking-wide">Score</p>
        <p className="text-2xl font-bold text-emerald-700">{score.toLocaleString()}</p>
      </div>
      <div className="w-px h-10 bg-slate-200" />
      <div className="text-right">
        <p className="text-xs text-slate-500 uppercase tracking-wide">Questions</p>
        <p className="text-2xl font-bold text-slate-700">{questionsAnswered}</p>
      </div>
    </div>
  );
}
