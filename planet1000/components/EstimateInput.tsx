'use client';

interface EstimateInputProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  unit?: string;
  label?: string;
}

export function EstimateInput({
  value,
  onChange,
  max = 1000,
  unit = 'people',
  label,
}: EstimateInputProps) {
  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (!isNaN(v) && v >= 0 && v <= max) {
      onChange(v);
    }
  };

  const pct = (value / max) * 100;

  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-sm font-medium text-slate-600">{label}</label>
      )}

      {/* Number display */}
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={0}
          max={max}
          value={value}
          onChange={handleNumber}
          className="w-28 text-3xl font-bold text-emerald-700 border-2 border-emerald-300 rounded-xl px-3 py-2 text-center focus:outline-none focus:border-emerald-500"
        />
        <span className="text-slate-500 text-lg">{unit}</span>
      </div>

      {/* Slider */}
      <div className="relative pt-1">
        <input
          type="range"
          min={0}
          max={max}
          value={value}
          onChange={handleSlider}
          className="w-full h-3 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #10b981 0%, #10b981 ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0</span>
          <span>{Math.round(max / 2)}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
}
