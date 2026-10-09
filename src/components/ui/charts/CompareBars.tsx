import { memo } from "react";
import { SERIES_BG, type SeriesColor } from "./scale";

export interface CompareRow {
  label: string;
  value: number;
  /** Already formatted value printed at the end of the bar; leave out when the figures stand next to it. */
  display?: string;
  color: SeriesColor;
}

/**
 * Two or three amounts of the same unit as thin horizontal bars on one scale
 * ("Kosten" vs "Ertragswert"). The text carries the numbers; the bars only
 * show the proportion, so this works as a hero visual in `KeyFigures`.
 */
export const CompareBars = memo(function CompareBars({ rows, className = "" }: { rows: CompareRow[]; className?: string }) {
  const max = Math.max(...rows.map((r) => Math.max(0, r.value)), 1e-9);
  return (
    <ul className={`space-y-1.5 ${className}`}>
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <span className="truncate">{r.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10" aria-hidden="true">
            <span className={`block h-full rounded-full ${SERIES_BG[r.color]}`} style={{ width: `${(Math.max(0, r.value) / max) * 100}%` }} />
          </span>
          {r.display !== undefined ? <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">{r.display}</span> : <span />}
        </li>
      ))}
    </ul>
  );
});
