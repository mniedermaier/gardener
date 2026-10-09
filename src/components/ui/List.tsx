import { memo, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface ListProps {
  children: ReactNode;
  /** Optional group heading ("Diese Woche", "September 2026"), sticky while scrolling. */
  header?: ReactNode;
  /** Accessible name when there is no visible header. */
  label?: string;
  /** Level of the header heading. 3 (default) inside a titled card or section, 2 directly under the page h1. */
  headingLevel?: 2 | 3;
  className?: string;
}

/**
 * One card holding rows separated by hairlines — instead of a card per row.
 * No overflow-hidden on purpose: row menus must be able to overflow the card.
 */
export function List({ children, header, label, headingLevel = 3, className = "" }: ListProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section className={`rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900 ${className}`} aria-label={header ? undefined : label}>
      {header && (
        <Heading className="sticky top-0 z-10 rounded-t-xl border-b border-gray-200 bg-gray-50/95 px-4 py-2 text-xs font-semibold text-gray-600 backdrop-blur dark:border-white/10 dark:bg-gray-900/95 dark:text-gray-400">
          {header}
        </Heading>
      )}
      <ul className="divide-y divide-gray-100 dark:divide-white/5">{children}</ul>
    </section>
  );
}

interface ListRowProps {
  /** Fixed-width leading slot (w-8): PlantIconDisplay, tinted Lucide tile, avatar. */
  leading?: ReactNode;
  title: ReactNode;
  /** Secondary line: "Hochbeet Süd · 3. Okt. · Tropf". */
  meta?: ReactNode;
  /** Optional third line / note, clamped to 2 lines. */
  description?: ReactNode;
  /** Badges after the title. */
  badges?: ReactNode;
  /** Right-aligned value (non-interactive): "1,9 kg", "12,50 €". */
  trailing?: ReactNode;
  /** Always-visible actions (IconButton, Menu). Sit above the row click target. */
  actions?: ReactNode;
  /** Whole row clickable → usually opens the edit dialog. */
  onClick?: () => void;
  /** Accessible name for the row button if `title` is not plain text. */
  clickLabel?: string;
  /** De-emphasised (done, resolved, archived). */
  muted?: boolean;
  className?: string;
}

/**
 * A row inside <List>. When `onClick` is set the title becomes a button whose
 * hit area stretches over the whole row (so actions stay separate, valid
 * buttons — no nested interactive elements).
 */
export const ListRow = memo(function ListRow({ leading, title, meta, description, badges, trailing, actions, onClick, clickLabel, muted, className = "" }: ListRowProps) {
  return (
    <li className={`relative flex min-h-14 first:rounded-t-xl last:rounded-b-xl items-center gap-3 px-4 py-3 ${onClick ? "hover:bg-gray-50 dark:hover:bg-white/5" : ""} ${className}`}>
      {leading !== undefined && <div className="flex w-8 shrink-0 items-center justify-center">{leading}</div>}
      <div className={`min-w-0 flex-1 ${muted ? "opacity-60" : ""}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {onClick ? (
            <button
              type="button"
              onClick={onClick}
              aria-label={clickLabel}
              className="min-w-0 text-left text-sm font-medium text-gray-900 after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus dark:text-gray-100"
            >
              {/* Up to two lines on narrow screens instead of an ellipsis after a few words. */}
              <span className="line-clamp-2 break-words">{title}</span>
            </button>
          ) : (
            <span className="line-clamp-2 min-w-0 break-words text-sm font-medium text-gray-900 dark:text-gray-100">{title}</span>
          )}
          {badges}
        </div>
        {meta && <div className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{meta}</div>}
        {description && <div className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{description}</div>}
      </div>
      {trailing !== undefined && (
        <div className={`shrink-0 text-right text-sm font-medium whitespace-nowrap text-gray-900 tabular-nums dark:text-gray-100 ${muted ? "opacity-60" : ""}`}>{trailing}</div>
      )}
      {actions && <div className="relative flex shrink-0 items-center gap-0.5">{actions}</div>}
      {onClick && !actions && trailing === undefined && <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-gray-400" />}
    </li>
  );
});
