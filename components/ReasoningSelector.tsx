'use client';

interface ReasoningSelectorProps {
  options: string[];
  selected: number | null;
  onSelect: (index: number) => void;
}

export function ReasoningSelector({ options, selected, onSelect }: ReasoningSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="font-semibold text-slate-700 mb-3">Why did you estimate that?</p>
      {options.map((option, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-150
            ${
              selected === i
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50'
            }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
