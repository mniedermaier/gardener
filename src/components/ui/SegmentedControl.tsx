import { useRef, type KeyboardEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: LucideIcon;
  /** Optional count shown after the label ("Aktiv 2"). */
  count?: number;
  /**
   * Icon only below sm (label stays for screen readers) and no share of the
   * row: a fourth "Datum …" segment then leaves room for the others.
   */
  compact?: boolean;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group, e.g. "Filter". */
  label: string;
  size?: "sm" | "md";
  /** Stretch segments to the full width (mobile filters, dialog toggles). */
  fullWidth?: boolean;
  /** Hug the content at every width, e.g. a unit toggle beside an input. */
  inline?: boolean;
  className?: string;
}

/**
 * Exclusive choice between 2–5 short options: filters, view modes, type
 * toggles in dialogs. Radio-group semantics with arrow-key navigation.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, label, size = "md", fullWidth, inline, className = "" }: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  const box = size === "sm" ? "min-h-8 px-2.5 text-xs" : "min-h-11 px-3 text-sm sm:min-h-9";
  // Phones: a regular-size control spans the row (a 2/3-wide control leaves a
  // grey stub that reads as broken), but never shrinks below its content, so
  // a long one still scrolls inside its wrapper. From sm on it hugs its content.
  const width = inline ? "inline-flex shrink-0" : fullWidth ? "flex w-full" : size === "md" ? "flex w-full min-w-max sm:inline-flex sm:w-auto" : "inline-flex";
  // Full width: segments share the row and may wrap to two lines — a long
  // label ("Anderes Datum", "Alle 2 Wochen") must never push past the edge.
  const segment = inline ? "whitespace-nowrap" : fullWidth ? "min-w-0 flex-1 text-center leading-tight" : size === "md" ? "flex-1 whitespace-nowrap sm:flex-none" : "whitespace-nowrap";

  return (
    <div role="radiogroup" aria-label={label} className={`${width} gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-white/5 ${className}`}>
      {options.map((o, i) => {
        const selected = o.value === value;
        // Nothing chosen yet: the first segment keeps the tab stop.
        const tabStop = selected || (i === 0 && !options.some((x) => x.value === value));
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={tabStop ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1 font-medium transition-colors ${o.compact ? "flex-none whitespace-nowrap sm:flex-1" : segment} ${box} ${
              selected
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-gray-50"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            }`}
          >
            {Icon && <Icon size={14} aria-hidden="true" className="shrink-0" />}
            {o.compact ? <span className="sr-only sm:not-sr-only">{o.label}</span> : o.label}
            {o.count !== undefined && " "}
            {o.count !== undefined && (
              <span className={`tabular-nums ${selected ? "text-gray-600 dark:text-gray-300" : "text-gray-500 dark:text-gray-400"}`}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
