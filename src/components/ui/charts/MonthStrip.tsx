import { memo } from "react";

interface MonthStripProps {
  /** 12 ratios (0–1), January first. */
  values: number[];
  /** Short month names, January first (formatDate(..., "month")). */
  monthLabels: string[];
  /** Long month names for the accessible table. */
  monthNames?: string[];
  /** Value text inside each cell ("25 %"). */
  formatValue: (ratio: number) => string;
  /** Month index marked like the charts' "Jetzt" line (current month). */
  current?: number;
  /** Text above the current month, e.g. t("charts.today"). */
  currentLabel?: string;
  /** Accessible name / table caption. */
  caption: string;
  /**
   * Ratio from which a month counts as covered (e.g. 0.25). Below it the tints
   * stay muted, so 6 % never looks "well covered"; only months that reach it
   * get the bright fill.
   */
  threshold?: number;
  className?: string;
}

/** Sequential single-hue ramp, light → dark; text switches for contrast. */
const STEPS = [
  "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300",
  // Steps 1–3: below the threshold, muted tints that still tell 3 % from 7 %.
  "bg-garden-50 text-garden-900 dark:bg-garden-500/[0.10] dark:text-garden-200",
  "bg-garden-100 text-garden-900 dark:bg-garden-500/[0.22] dark:text-garden-100",
  "bg-garden-200 text-garden-900 dark:bg-garden-500/[0.38] dark:text-garden-50",
  // Steps 4–5: the threshold is reached — bright fill, dark text on the top step in dark mode.
  "bg-garden-400 text-white dark:bg-garden-500 dark:text-gray-950",
  "bg-garden-600 text-white dark:bg-garden-300 dark:text-gray-950",
];
/**
 * Step of a value on an absolute scale: the threshold splits muted (below)
 * from bright (reached), so the colour agrees with the note under the strip.
 * The printed value carries the exact number.
 */
const step = (raw: number, threshold: number) => {
  // Step from the shown (rounded) percentage: two tiles that print "6 %" share a tint.
  const v = Math.round(raw * 100) / 100;
  if (v <= 0.005) return 0;
  if (v < threshold) return v < threshold / 4 ? 1 : v < threshold / 2 ? 2 : 3;
  return v < Math.min(1, threshold * 2.5) ? 4 : 5;
};

/**
 * 12-month heatmap strip (one hue, five steps). The value is printed in each
 * cell, so the colour only reinforces it. Wraps to 2 rows of 6 on phones.
 */
export const MonthStrip = memo(function MonthStrip({ values, monthLabels, monthNames, formatValue, current, currentLabel, caption, threshold = 0.25, className = "" }: MonthStripProps) {
  return (
    <figure className={className}>
      <ol className="grid grid-cols-6 gap-1 sm:grid-cols-12" aria-hidden="true">
        {values.map((v, i) => (
          <li key={i} className="flex flex-col items-center gap-1">
            {/* Same marker as the charts: "Jetzt" above, dashed outline instead of a heavy ring. */}
            {currentLabel !== undefined && (
              <span className="h-4 text-[11px] leading-4 font-semibold text-gray-900 dark:text-gray-100">{i === current ? currentLabel : ""}</span>
            )}
            <span
              className={`flex h-10 w-full items-center justify-center rounded-md text-xs font-medium tabular-nums ${STEPS[step(v, threshold)]} ${
                i === current ? "outline-1 outline-offset-2 outline-dashed outline-gray-900/50 dark:outline-white/50" : ""
              }`}
            >
              {formatValue(v)}
            </span>
            <span className={`text-xs ${i === current ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}>{monthLabels[i]}</span>
          </li>
        ))}
      </ol>
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <tbody>
            {values.map((v, i) => (
              <tr key={i}>
                <th scope="row">{(monthNames ?? monthLabels)[i]}</th>
                <td>{formatValue(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
});
