import { Fragment, memo, useLayoutEffect, useRef, type ReactNode } from "react";
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
  /** Inside a Card: no own frame, the card draws it. */
  bare?: boolean;
}

/**
 * One card holding rows separated by hairlines — instead of a card per row.
 * No overflow-hidden on purpose: row menus must be able to overflow the card.
 */
export function List({ children, header, label, headingLevel = 3, className = "", bare = false }: ListProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section className={`${bare ? "border-t border-gray-100 dark:border-white/5" : "rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900"} ${className}`} aria-label={header ? undefined : label}>
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
  /**
   * Secondary line: "Hochbeet Süd · 3. Okt. · Tropf". Pass the parts as an
   * array (falsy entries are skipped); a string is split at " · ". Each part
   * stays on one line and keeps its separator, so no line starts with "·".
   */
  meta?: ReactNode | MetaPart[];
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

function hasMeta(meta: ReactNode | MetaPart[]): boolean {
  return Array.isArray(meta) ? meta.some((p) => p !== null && p !== undefined && p !== false && p !== "") : !!meta;
}

/** Segmented meta is never clamped: clamping would cut whole segments (the date) off. */
function isSegmented(meta: ReactNode | MetaPart[]): boolean {
  return Array.isArray(meta) || (typeof meta === "string" && meta.includes(META_SEPARATOR));
}

type MetaPart = ReactNode | null | undefined | false;
const META_SEPARATOR = " · ";

/** Renders meta parts as unbreakable segments: "A ·" "B ·" "C". */
function MetaLine({ meta }: { meta: ReactNode | MetaPart[] }) {
  const ref = useRef<HTMLSpanElement>(null);
  const parts: MetaPart[] = Array.isArray(meta) ? meta : typeof meta === "string" && meta.includes(META_SEPARATOR) ? meta.split(META_SEPARATOR) : [meta];
  const visible = parts.filter((p) => p !== null && p !== undefined && p !== false && p !== "");
  // A separator before a line break would dangle at the line end: hide it
  // whenever the next part starts a new line (measured, so it follows the width).
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const measure = () => {
      const boxes = [...root.querySelectorAll<HTMLElement>(":scope > [data-meta-part]")];
      boxes.forEach((box, i) => {
        const sep = box.querySelector<HTMLElement>("[data-meta-sep]");
        const next = boxes[i + 1];
        if (sep) sep.style.visibility = next && next.offsetTop > box.offsetTop ? "hidden" : "";
      });
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(root);
    return () => ro?.disconnect();
  });
  if (visible.length <= 1 && !Array.isArray(meta)) return <>{meta}</>;
  return (
    <span ref={ref}>
      {visible.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          {/* An atomic box: moves to the next line as a whole and only wraps inside when it is wider than the row. */}
          <span data-meta-part="" className="inline-block max-w-full align-top break-words">
            {part}
            {i < visible.length - 1 && <span data-meta-sep="" aria-hidden="true">{"\u00a0·"}</span>}
          </span>
        </Fragment>
      ))}
    </span>
  );
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
        {hasMeta(meta) && <div className={`mt-0.5 text-xs text-gray-500 dark:text-gray-400 ${isSegmented(meta) ? "" : "line-clamp-2"}`}><MetaLine meta={meta} /></div>}
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
