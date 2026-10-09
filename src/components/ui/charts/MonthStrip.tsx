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
  /** Text above the current month, e.g. t("charts.now"). */
  currentLabel?: string;
  /** Accessible name / table caption. */
  caption: string;
  className?: string;
}

/** Sequential single-hue ramp, light → dark; text switches for contrast. */
const STEPS = [
  "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300",
  "bg-garden-100 text-garden-900 dark:bg-garden-900/60 dark:text-garden-100",
  "bg-garden-200 text-garden-900 dark:bg-garden-800 dark:text-garden-50",
  "bg-garden-400 text-white dark:bg-garden-600 dark:text-white",
  "bg-garden-600 text-white dark:bg-garden-500 dark:text-gray-950",
];
/**
 * Step of a value on the strip's own range (at least 0–10 %): in a garden that
 * covers 3–7 % the tint still tells the weak from the strong months. The
 * printed value carries the absolute number.
 */
const step = (v: number, top: number) => {
  if (v <= 0.005) return 0;
  const n = v / top;
  return n < 0.25 ? 1 : n < 0.5 ? 2 : n < 0.8 ? 3 : 4;
};

/**
 * 12-month heatmap strip (one hue, five steps). The value is printed in each
 * cell, so the colour only reinforces it. Wraps to 2 rows of 6 on phones.
 */
export const MonthStrip = memo(function MonthStrip({ values, monthLabels, monthNames, formatValue, current, currentLabel, caption, className = "" }: MonthStripProps) {
  const top = Math.max(0.1, ...values);
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
              className={`flex h-10 w-full items-center justify-center rounded-md text-xs font-medium tabular-nums ${STEPS[step(v, top)]} ${
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
