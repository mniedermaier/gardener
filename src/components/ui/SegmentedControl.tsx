import { useRef, type KeyboardEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: LucideIcon;
  /** Optional count shown after the label ("Aktiv 2"). */
  count?: number;
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
  className?: string;
}

/**
 * Exclusive choice between 2–5 short options: filters, view modes, type
 * toggles in dialogs. Radio-group semantics with arrow-key navigation.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, label, size = "md", fullWidth, className = "" }: SegmentedControlProps<T>) {
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

  return (
    <div role="radiogroup" aria-label={label} className={`${fullWidth ? "flex w-full" : "inline-flex"} gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-white/5 ${className}`}>
      {options.map((o, i) => {
        const selected = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${fullWidth ? "flex-1" : ""} ${box} ${
              selected
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-gray-50"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            }`}
          >
            {Icon && <Icon size={14} aria-hidden="true" />}
            {o.label}
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
