import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'highlight' | 'muted';
}

export function Card({ variant = 'default', className = '', children, ...props }: CardProps) {
  const variants = {
    default: 'bg-white border border-slate-200',
    highlight: 'bg-emerald-50 border border-emerald-200',
    muted: 'bg-slate-50 border border-slate-100',
  };

  return (
    <div
      className={`rounded-2xl shadow-sm p-6 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
