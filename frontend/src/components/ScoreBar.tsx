import type { ScoreBreakdown } from '../api/types';

interface Props {
  score: number;
  breakdown: ScoreBreakdown;
}

/** Visualizes WHY a repo ranks where it does (score explainability). */
export default function ScoreBar({ score, breakdown }: Props) {
  const total = breakdown.stars + breakdown.forks + breakdown.recency || 1;
  const segments = [
    { label: 'Stars', value: breakdown.stars, color: 'bg-blue-500' },
    { label: 'Forks', value: breakdown.forks, color: 'bg-emerald-500' },
    { label: 'Recency', value: breakdown.recency, color: 'bg-amber-500' },
  ];

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">
          {score.toFixed(1)}
        </span>
      </div>
      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100"
        role="img"
        aria-label={`Score ${score.toFixed(1)} of 100`}
      >
        {segments.map((s) => (
          <div
            key={s.label}
            className={s.color}
            style={{ width: `${(s.value / total) * 100}%` }}
            title={`${s.label}: ${s.value.toFixed(1)}`}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-3 text-xs text-gray-500">
        {segments.map((s) => (
          <span key={s.label}>
            {s.label} {s.value.toFixed(1)}
          </span>
        ))}
      </div>
    </div>
  );
}