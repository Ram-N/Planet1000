'use client';

interface ProgressBarProps {
  value: number; // 0–100
  color?: string;
  label?: string;
  showPercent?: boolean;
}

export function ProgressBar({
  value,
  color = 'bg-emerald-500',
  label,
  showPercent = false,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between mb-1 text-sm text-slate-600">
          {label && <span>{label}</span>}
          {showPercent && <span>{Math.round(clamped)}%</span>}
        </div>
      )}
      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
        <div
          className={`${color} h-full rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
