import { memo } from "react";

interface RangeBarProps {
  min: number;
  max: number;
  /** Shared scale of all rows so the bars are comparable. */
  domain: [number, number];
  /** Threshold drawn as a tick (e.g. frost threshold). */
  threshold?: number;
  /** Highlights the bar (e.g. frost night) — paired with a text badge by the caller. */
  emphasis?: boolean;
  label: string;
  className?: string;
}

/** Min–max range on a shared scale (temperature per day). */
export const RangeBar = memo(function RangeBar({ min, max, domain, threshold, emphasis, label, className = "" }: RangeBarProps) {
  const [d0, d1] = domain;
  const span = d1 - d0 || 1;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - d0) / span) * 100));
  return (
    <div role="img" aria-label={label} className={`relative h-2 rounded-full bg-gray-100 dark:bg-white/10 ${className}`}>
      <span
        className={`absolute inset-y-0 rounded-full ${emphasis ? "bg-info" : "bg-earth-300 dark:bg-earth-400"}`}
        style={{ left: `${pct(min)}%`, width: `${Math.max(4, pct(max) - pct(min))}%` }}
      />
      {threshold !== undefined && threshold > d0 && threshold < d1 && (
        <span className="absolute -inset-y-1 w-px bg-gray-500 dark:bg-gray-400" style={{ left: `${pct(threshold)}%` }} aria-hidden="true" />
      )}
    </div>
  );
});
