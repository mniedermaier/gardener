import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  icon?: LucideIcon;
  /** Destructive entries render in the danger tone; keep them last. */
  danger?: boolean;
  disabled?: boolean;
}

interface MenuProps {
  items: Array<MenuItem | "separator">;
  /** Accessible name of the trigger (and its tooltip), e.g. "Weitere Aktionen". */
  label: string;
  /** Custom trigger content; defaults to a "…" icon button. */
  trigger?: ReactNode;
  /** Which edge the panel aligns to. */
  align?: "start" | "end";
  className?: string;
}

/**
 * Overflow/action menu (WAI-ARIA menu button). Enter/Space/↓ opens and focuses
 * the first item, ↑/↓/Home/End move, Esc closes and returns focus, Tab or a
 * click outside closes.
 */
export function Menu({ items, label, trigger, align = "end", className = "" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const enabled = items
    .map((item, i) => (item !== "separator" && !item.disabled ? i : -1))
    .filter((i) => i >= 0);

  const focusItem = useCallback((index: number) => itemRefs.current[index]?.focus(), []);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, close]);

  const openAt = (where: "first" | "last") => {
    setOpen(true);
    const target = where === "first" ? enabled[0] : enabled[enabled.length - 1];
    requestAnimationFrame(() => focusItem(target));
  };

  const onTriggerKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openAt("first");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      openAt("last");
    }
  };

  const onMenuKeyDown = (e: KeyboardEvent) => {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    const pos = enabled.indexOf(current);
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // keep a surrounding <dialog> open
      close(true);
    } else if (e.key === "Tab") {
      close(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      focusItem(enabled[(pos + 1) % enabled.length]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusItem(enabled[(pos - 1 + enabled.length) % enabled.length]);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusItem(enabled[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      focusItem(enabled[enabled.length - 1]);
    }
  };

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={trigger ? undefined : label}
        title={trigger ? undefined : label}
        onClick={() => (open ? close(false) : setOpen(true))}
        onKeyDown={onTriggerKeyDown}
        className={
          trigger
            ? "inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 shadow-xs hover:bg-gray-50 dark:border-white/15 dark:bg-white/5 dark:text-gray-100 dark:hover:bg-white/10"
            : "inline-flex size-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 sm:size-9 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100"
        }
      >
        {trigger ?? <MoreHorizontal size={18} aria-hidden="true" />}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          tabIndex={-1}
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className={`absolute top-full z-50 mt-1 min-w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-gray-800 ${align === "end" ? "right-0" : "left-0"}`}
        >
          {items.map((item, i) =>
            item === "separator" ? (
              <hr key={`sep-${i}`} className="my-1 border-gray-100 dark:border-white/10" />
            ) : (
              <button
                key={item.label}
                ref={(el) => { itemRefs.current[i] = el; }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                onClick={() => {
                  close(true);
                  item.onSelect();
                }}
                className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm focus-visible:outline-none disabled:opacity-50 sm:min-h-9 ${
                  item.danger
                    ? "text-danger hover:bg-danger/10 focus:bg-danger/10"
                    : "text-gray-800 hover:bg-gray-100 focus:bg-gray-100 dark:text-gray-100 dark:hover:bg-white/10 dark:focus:bg-white/10"
                }`}
              >
                {item.icon && <item.icon size={16} aria-hidden="true" className="shrink-0" />}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
