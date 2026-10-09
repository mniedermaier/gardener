import { memo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { TONE_SOFT, type Tone } from "../tone";

export interface KeyFigure {
  label: ReactNode;
  /** Already formatted ("25 l", "473,10 €"). */
  value: ReactNode;
  /** One short line under the value ("davon 120 l Regen"). */
  hint?: ReactNode;
  /** Makes the figure a link to the page that explains it. */
  to?: string;
  /** Accessible name of the link when label + value do not say enough. */
  linkLabel?: string;
}

export interface KeyFiguresProps {
  /** The one number the page is about: large, with an optional visual (Meter, Sparkline). */
  hero: KeyFigure & {
    icon?: LucideIcon;
    tone?: Tone;
    visual?: ReactNode;
    /** "inline" (default): beside the number when it fits (Sparkline, Meter). "below": always full width (CompareBars). */
    visualPlacement?: "inline" | "below";
  };
  /** Secondary figures, shown inline and smaller. 1–3 work best. */
  items?: KeyFigure[];
  /**
   * "row" (page head): hero on the left, secondaries beside it, separated by
   * hairlines; on phones the secondaries wrap below the hero in two columns.
   * "stack" (side column): hero on top, secondaries as label/value rows.
   */
  layout?: "row" | "stack";
  className?: string;
}

const CARD = "overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900";
const LINK = "block transition-colors hover:bg-gray-50 focus-visible:outline-offset-[-2px] dark:hover:bg-white/5";

function Wrap({ to, label, className, children }: { to?: string; label?: string; className: string; children: ReactNode }) {
  return to
    ? <Link to={to} aria-label={label} className={`${LINK} ${className}`}>{children}</Link>
    : <div className={className}>{children}</div>;
}

/**
 * Hero figure + inline secondary figures in one surface — the alternative to
 * a row of four equal StatCards when one number matters most and the others
 * only qualify it. See DESIGN_SYSTEM.md §7 "Key figures".
 */
export const KeyFigures = memo(function KeyFigures({ hero, items = [], layout = "row", className = "" }: KeyFiguresProps) {
  const Icon = hero.icon;
  const heroBody = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{hero.label}</p>
        {Icon && (
          <span className={`-mt-1 -mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg ${TONE_SOFT[hero.tone ?? "neutral"]}`} aria-hidden="true">
            <Icon size={16} />
          </span>
        )}
      </div>
      {/* The visual sits beside the number when there is room, below it otherwise. */}
      <div className="mt-1 flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
        <p className="text-3xl font-semibold tracking-tight text-gray-900 tabular-nums dark:text-gray-50">{hero.value}</p>
        {hero.visual && (
          <div className={hero.visualPlacement === "below" ? "w-full" : "min-w-0 grow basis-40 pb-1 [&>svg]:ml-auto"}>{hero.visual}</div>
        )}
      </div>
      {hero.hint && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{hero.hint}</p>}
    </>
  );

  if (layout === "stack") {
    return (
      <div className={`${CARD} ${className}`}>
        <Wrap to={hero.to} label={hero.linkLabel} className="p-4">{heroBody}</Wrap>
        {items.length > 0 && (
          <ul className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-white/5 dark:border-white/5">
            {items.map((it, i) => (
              <li key={i}>
                <Wrap to={it.to} label={it.linkLabel} className="flex min-h-11 items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-gray-700 dark:text-gray-300">{it.label}</span>
                    {it.hint && <span className="block text-xs text-gray-500 dark:text-gray-400">{it.hint}</span>}
                  </span>
                  <span className="shrink-0 text-base font-semibold tabular-nums text-gray-900 dark:text-gray-50">{it.value}</span>
                  {it.to && <ChevronRight size={16} aria-hidden="true" className="-mr-1 shrink-0 text-gray-400 dark:text-gray-500" />}
                </Wrap>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className={`${CARD} sm:flex ${className}`}>
      <Wrap to={hero.to} label={hero.linkLabel} className="p-4 sm:w-2/5 sm:shrink-0 sm:p-5 lg:w-1/3">{heroBody}</Wrap>
      {items.length > 0 && (
        <div className="grid grid-cols-2 border-t border-gray-100 sm:flex sm:flex-1 sm:border-t-0 sm:border-l dark:border-white/5">
          {items.map((it, i) => (
            <Wrap
              key={i}
              to={it.to}
              label={it.linkLabel}
              className={`min-w-0 p-4 sm:flex-1 sm:p-5 ${i === items.length - 1 && i % 2 === 0 ? "col-span-2" : ""} ${i % 2 === 1 ? "border-l border-gray-100 dark:border-white/5" : ""} ${i >= 2 ? "border-t border-gray-100 sm:border-t-0 dark:border-white/5" : ""} ${i > 0 ? "sm:border-l sm:border-gray-100 sm:dark:border-white/5" : ""}`}
            >
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{it.label}</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-gray-900 tabular-nums dark:text-gray-50">{it.value}</p>
              {it.hint && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{it.hint}</p>}
            </Wrap>
          ))}
        </div>
      )}
    </div>
  );
});
