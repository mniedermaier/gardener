import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { useScrollFade } from "./useScrollFade";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the tab list. */
  label: string;
  /** If given, rendered as the tabpanel of the active tab. */
  children?: ReactNode;
  className?: string;
}

/**
 * Underlined tabs for sub-views of one page (WAI-ARIA tabs: roving tabindex,
 * ←/→/Home/End). Pass the active view as children; without children only the
 * tab list renders (e.g. inside PageHeader `tabs`) and you render the panel.
 */
export function Tabs<T extends string>({ items, value, onChange, label, children, className = "" }: TabsProps<T>) {
  const baseId = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabId = (v: string) => `${baseId}-tab-${v}`;
  const panelId = `${baseId}-panel`;
  const { ref: listRef, fadeClass } = useScrollFade<HTMLDivElement>('[aria-selected="true"]', value);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(items[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className={className}>
      <div ref={listRef} role="tablist" aria-label={label} className={`-mb-px flex gap-1 overflow-x-auto border-b border-gray-200 [scrollbar-width:none] dark:border-white/10 ${fadeClass}`}>
        {items.map((item, i) => {
          const selected = item.value === value;
          return (
            <button
              key={item.value}
              ref={(el) => { refs.current[i] = el; }}
              id={tabId(item.value)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={children !== undefined ? panelId : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors ${
                selected
                  ? "border-garden-600 text-garden-700 dark:border-garden-400 dark:text-garden-300"
                  : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              }`}
            >
              {item.label}
              {item.count !== undefined && " "}
              {item.count !== undefined && (
                <span className="rounded-full bg-gray-100 px-1.5 text-xs tabular-nums text-gray-600 dark:bg-white/10 dark:text-gray-300">{item.count}</span>
              )}
            </button>
          );
        })}
      </div>
      {children !== undefined && (
        <div role="tabpanel" id={panelId} aria-labelledby={tabId(value)} tabIndex={0} className="pt-4 focus-visible:outline-none">
          {children}
        </div>
      )}
    </div>
  );
}
