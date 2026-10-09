import { memo, useId } from "react";
import { SERIES_BG, SERIES_TEXT, type SeriesColor } from "./scale";

export interface LegendItem {
  label: string;
  color: SeriesColor;
  /** "solid" (default), "hatched" (forecast/estimate), "dotted" (rain), "line" (target/marker). */
  swatch?: "solid" | "hatched" | "dotted" | "line";
}

/** Hatch pattern for forecast/estimate marks — meaning never by colour alone. */
export function HatchPattern({ id, className }: { id: string; className?: string }) {
  return (
    <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)" className={className}>
      <rect width="6" height="6" fill="currentColor" opacity="0.18" />
      <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="2.5" />
    </pattern>
  );
}

/** Dot pattern ("drops") for rain next to watering — a second series of the same family. */
export function DotPattern({ id, className }: { id: string; className?: string }) {
  return (
    // `className` sets the colour: pattern content takes currentColor from the pattern, not from the shape using it.
    <pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse" className={className}>
      <rect width="5" height="5" fill="currentColor" opacity="0.3" />
      <circle cx="2.5" cy="2.5" r="1.1" fill="currentColor" />
    </pattern>
  );
}

export const Legend = memo(function Legend({ items, className = "" }: { items: LegendItem[]; className?: string }) {
  const pid = useId();
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400 ${className}`}>
      {items.map((it, i) => (
        <li key={it.label} className="inline-flex items-center gap-1.5">
          {it.swatch === "hatched" || it.swatch === "dotted" ? (
            <svg width="12" height="12" aria-hidden="true" className={SERIES_TEXT[it.color]}>
              <defs>{it.swatch === "dotted" ? <DotPattern id={`${pid}-${i}`} className={SERIES_TEXT[it.color]} /> : <HatchPattern id={`${pid}-${i}`} className={SERIES_TEXT[it.color]} />}</defs>
              <rect width="12" height="12" rx="2" fill={`url(#${pid}-${i})`} />
            </svg>
          ) : it.swatch === "line" ? (
            <span className="h-0.5 w-3 bg-gray-700 dark:bg-gray-300" aria-hidden="true" />
          ) : (
            <span className={`size-3 rounded-sm ${SERIES_BG[it.color]}`} aria-hidden="true" />
          )}
          {it.label}
        </li>
      ))}
    </ul>
  );
});
