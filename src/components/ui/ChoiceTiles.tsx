import { useId, useRef, type KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { LABEL_CLASS } from "./Field";

export interface ChoiceTile<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

interface ChoiceTilesProps<T extends string> {
  /** Visible caption above the tiles; also the radiogroup's accessible name. */
  label: string;
  options: ChoiceTile<T>[];
  /** "" = nothing chosen yet (no tile active, the first tile takes the tab stop). */
  value: T | "";
  onChange: (value: T) => void;
  className?: string;
}

const SM_COLS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

/**
 * Columns from `sm` up for `count` tiles: never a lone tile in the last row
 * (4 → 4, 5 → 3+2, 6 → 3, 7 → 4+3, 8 → 4×2, 9 → 3×3). DESIGN_SYSTEM rule 9.
 */
export function choiceColumns(count: number): number {
  if (count <= 4) return Math.max(1, count);
  if (count % 4 === 0) return 4;
  if (count % 3 === 0) return 3;
  return count % 4 >= 2 ? 4 : 3;
}

/**
 * A small fixed set of choices (≤ 8) as icon tiles — the one picker for bed
 * environment, animal species, health event type, preservation method.
 * Phones: two columns, icon left of the label, an odd last tile spans the row.
 * From `sm`: icon above the label, centred; labels wrap whole words and are
 * never truncated or hyphenated. Behaves as a radiogroup (arrow keys move and
 * select, one tab stop).
 */
export function ChoiceTiles<T extends string>({ label, options, value, onChange, className = "" }: ChoiceTilesProps<T>) {
  const labelId = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const cols = choiceColumns(options.length);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const tabIndexFor = (i: number) => (selectedIndex === -1 ? (i === 0 ? 0 : -1) : i === selectedIndex ? 0 : -1);

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className={className}>
      <p id={labelId} className={LABEL_CLASS}>{label}</p>
      <div role="radiogroup" aria-labelledby={labelId} className={cn("grid grid-cols-2 gap-2", SM_COLS[cols])}>
        {options.map((o, i) => {
          const Icon = o.icon;
          const selected = o.value === value;
          const spanLast = i === options.length - 1 && options.length % 2 === 1;
          return (
            <button
              key={o.value}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={tabIndexFor(i)}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "flex min-h-11 min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm leading-tight transition-colors",
                "sm:flex-col sm:justify-center sm:gap-1.5 sm:px-2 sm:py-3 sm:text-center",
                spanLast && "col-span-2 sm:col-span-1",
                selected
                  ? "border-garden-600 bg-garden-50 font-medium text-garden-800 ring-1 ring-garden-600 dark:border-garden-400 dark:bg-garden-500/15 dark:text-garden-200 dark:ring-garden-400"
                  : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5",
              )}
            >
              <Icon size={18} aria-hidden="true" className="shrink-0" />
              {/* Whole words only: no truncation, no hyphenation ("Bienenvölker", "Entwurmung"). */}
              <span className="min-w-0 break-words">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
