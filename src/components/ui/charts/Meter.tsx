import { memo, useId } from "react";
import { HatchPattern } from "./Legend";
import { SERIES_FILL, SERIES_TEXT, type SeriesColor } from "./scale";

interface MeterProps {
  /** Recorded value (solid fill). */
  actual?: number;
  /** Forecast/estimate (hatched fill behind the actual value). */
  forecast?: number;
  /** Scale maximum, usually the target. Values above it are clipped. */
  max: number;
  /** Optional target marker if it differs from `max`. */
  target?: number;
  /** Accessible description: "Tomate: 4 von 30 kg erfasst, Prognose 22 kg". */
  label: string;
  color?: SeriesColor;
  /** Bar height in px (default 8). */
  size?: number;
  className?: string;
}

/**
 * Horizontal progress bar: actual (solid) over forecast (hatched) against a
 * target. Brand colour only — the number next to it says how good it is, the
 * colour does not (no red/amber/green ladder).
 */
export const Meter = memo(function Meter({ actual, forecast, max, target, label, color = "brand", size = 8, className = "" }: MeterProps) {
  const pid = useId();
  const pct = (v: number | undefined) => (v === undefined || !(max > 0) ? 0 : Math.max(0, Math.min(100, (v / max) * 100)));
  // A non-zero value never shrinks below a sliver (~3 %), or 0,4 of 6 kg would vanish.
  const sliver = (p: number) => (p > 0 ? Math.max(p, 3) : 0);
  const a = sliver(pct(actual));
  // A forecast just above the actual value would hide under the solid bar:
  // keep at least a few percent of hatching visible beyond it.
  const fRaw = sliver(pct(forecast));
  const f = forecast !== undefined && actual !== undefined && forecast > actual && a > 0 ? Math.min(100, Math.max(fRaw, a + 3)) : fRaw;
  const t = target !== undefined ? pct(target) : null;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(max, actual ?? forecast ?? 0)}
      className={`relative ${className}`}
      style={{ height: size }}
    >
      <svg width="100%" height={size} aria-hidden="true" className="block">
        <defs><HatchPattern id={pid} className={SERIES_TEXT[color]} /></defs>
        <rect width="100%" height={size} rx={size / 2} className="fill-gray-100 dark:fill-white/10" />
        {/* Forecast: a light tint of the series colour under the hatch, so a few
            percent stay visible on the track (dark mode especially). */}
        {f > 0 && <rect width={`${f}%`} height={size} rx={size / 2} fill="currentColor" className={`${SERIES_TEXT[color]} [fill-opacity:0.3] dark:[fill-opacity:0.75]`} />}
        {f > 0 && <rect width={`${f}%`} height={size} rx={size / 2} fill={`url(#${pid})`} className={SERIES_TEXT[color]} />}
        {a > 0 && <rect width={`${a}%`} height={size} rx={size / 2} className={SERIES_FILL[color]} />}
      </svg>
      {t !== null && t < 100 && (
        <span className="absolute -top-1 -bottom-1 w-0.5 rounded bg-gray-700 dark:bg-gray-300" style={{ left: `calc(${t}% - 1px)` }} aria-hidden="true" />
      )}
    </div>
  );
});
