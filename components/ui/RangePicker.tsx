'use client';

import type { DateRange } from '@/types';

const RANGES: { key: DateRange; label: string }[] = [
  { key: '7d', label: '7N' },
  { key: '10d', label: '10N' },
  { key: '20d', label: '20N' },
  { key: '30d', label: '30N' },
  { key: '60d', label: '60N' },
  { key: '90d', label: '90N' }
];

export default function RangePicker({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) {
  return (
    <div className="flex gap-0 bg-bg-1 border border-line rounded-xl p-1">
      {RANGES.map((r) => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          className={`px-3.5 py-2 rounded-[9px] text-[12.5px] font-mono font-semibold transition-all ${
            value === r.key ? 'bg-orange text-white shadow-md shadow-orange/30' : 'text-text-1 hover:text-text-0'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
