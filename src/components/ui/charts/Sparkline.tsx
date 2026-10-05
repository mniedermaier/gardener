import { memo } from "react";
import { SERIES_FILL, type SeriesColor } from "./scale";

interface SparklineProps {
  values: number[];
  /** Summary for screen readers: "Ernte der letzten 8 Wochen, zuletzt 2,1 kg". */
  label: string;
  width?: number;
  height?: number;
  color?: SeriesColor;
  className?: string;
}

/** Tiny trend line for stat tiles. 2 px line, last point marked; no axes. */
export const Sparkline = memo(function Sparkline({ values, label, width = 96, height = 28, color = "brand", className = "" }: SparklineProps) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(0, ...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (width - 4) + 2, height - 2 - ((v - min) / span) * (height - 4)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={width} height={height} role="img" aria-label={label} className={className}>
      <path d={d} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-garden-500 dark:stroke-garden-400" />
      <circle cx={lx} cy={ly} r={3} className={SERIES_FILL[color]} />
    </svg>
  );
});
