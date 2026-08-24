'use client';

interface QuestionChainProps {
  total: number;
  completed: number;
  topic: string;
}

export function QuestionChain({ total, completed, topic }: QuestionChainProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>Topic: <span className="font-medium text-slate-700 capitalize">{topic}</span></span>
        <span>·</span>
        <span>{completed} / {total} questions</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded-full transition-all duration-300 ${
              i < completed ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
