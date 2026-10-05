import { memo, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { TONE_SOFT, TONE_TEXT, type Tone } from "./tone";

interface StatCardProps {
  label: ReactNode;
  /** Already formatted (use useFormat): "1,9", "473,10 €", "12". */
  value: ReactNode;
  /** Unit shown smaller after the value: "kg", "l", "Stk." */
  unit?: ReactNode;
  /** Secondary line under the value: "von 25 kg Ziel", "seit letzter Woche". */
  hint?: ReactNode;
  /** Small trend chip. Colour comes from `tone`, never from the value itself. */
  trend?: { label: ReactNode; direction?: "up" | "down" | "flat"; tone?: Tone };
  icon?: LucideIcon;
  /** Tints the icon tile only. The number stays neutral. */
  tone?: Tone;
  className?: string;
}

const TREND_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: ArrowRight };

/**
 * One KPI tile. Left-aligned label → value → hint, value in 24 px semibold
 * tabular figures. Use in a grid: `grid grid-cols-2 gap-3 lg:grid-cols-4`.
 */
export const StatCard = memo(function StatCard({ label, value, unit, hint, trend, icon: Icon, tone = "brand", className = "" }: StatCardProps) {
  const TrendIcon = trend ? TREND_ICON[trend.direction ?? "flat"] : null;
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-gray-900 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        {Icon && (
          <span className={`-mt-1 -mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg ${TONE_SOFT[tone]}`} aria-hidden="true">
            <Icon size={16} />
          </span>
        )}
      </div>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 tabular-nums dark:text-gray-50">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">{unit}</span>}
      </p>
      {(hint || trend) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          {trend && TrendIcon && (
            <span className={`inline-flex items-center gap-0.5 font-medium ${TONE_TEXT[trend.tone ?? "neutral"]}`}>
              <TrendIcon size={12} aria-hidden="true" />
              {trend.label}
            </span>
          )}
          {hint && <span>{hint}</span>}
        </div>
      )}
    </div>
  );
});
