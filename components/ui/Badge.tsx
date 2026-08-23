interface BadgeProps {
  label: string;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'slate';
}

const colorMap = {
  green: 'bg-emerald-100 text-emerald-800',
  blue: 'bg-blue-100 text-blue-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  slate: 'bg-slate-100 text-slate-700',
};

export function Badge({ label, color = 'slate' }: BadgeProps) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[color]}`}>
      {label}
    </span>
  );
}
