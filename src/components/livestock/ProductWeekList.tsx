import { Fragment, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { addDays, endOfWeek, getISOWeek, startOfWeek } from "date-fns";
import { useFormat } from "@/hooks/useFormat";
import { toDate, toISODate } from "@/lib/format";
import { PRODUCT_TYPES, type ProductTotals } from "@/lib/metrics";
import type { AnimalProduct } from "@/types/animal";
import { List, ListRow } from "@/components/ui/List";
import { Button } from "@/components/ui/Button";
import { PRODUCT_ICON } from "./icons";
import { IconTile, formatProductAmount } from "./shared";

export interface ProductWeek {
  key: string;
  week: number;
  from: Date;
  to: Date;
  items: AnimalProduct[];
  totals: ProductTotals;
}

/** Products (sorted newest first) grouped into ISO weeks with totals per product. */
export function groupByWeek(items: AnimalProduct[]): ProductWeek[] {
  const out: ProductWeek[] = [];
  for (const p of items) {
    const d = toDate(p.date) ?? new Date(0);
    const from = startOfWeek(d, { weekStartsOn: 1 });
    const key = toISODate(from);
    let g = out.find((x) => x.key === key);
    if (!g) {
      g = { key, week: getISOWeek(d), from, to: endOfWeek(d, { weekStartsOn: 1 }), items: [], totals: { eggs: 0, honey: 0, meat: 0, wax: 0, milk: 0, wool: 0 } };
      out.push(g);
    }
    g.items.push(p);
    g.totals[p.type] += p.unit === "g" ? p.quantity / 1000 : p.quantity;
  }
  return out;
}

/**
 * Weeks grouped by the month that holds most of their days (the month of the
 * week's Thursday, as ISO weeks count) — a week is never split across two
 * cards, and "KW 40 (28. Sept.–4. Okt.)" lands under October like most of its
 * eggs in the monthly chart.
 */
export function weeksByMonth(weeks: ProductWeek[]): { key: string; date: Date; count: number; weeks: ProductWeek[] }[] {
  const out: { key: string; date: Date; count: number; weeks: ProductWeek[] }[] = [];
  for (const w of weeks) {
    const thursday = addDays(w.from, 3);
    const key = toISODate(thursday).slice(0, 7);
    let g = out.find((x) => x.key === key);
    if (!g) {
      g = { key, date: thursday, count: 0, weeks: [] };
      out.push(g);
    }
    g.weeks.push(w);
    g.count += w.items.length;
  }
  return out;
}

interface Props {
  /** Sorted newest first. */
  products: AnimalProduct[];
  /** Extra meta for an entry row (e.g. the animal on the production page). */
  entryMeta?: (p: AnimalProduct) => string | null;
  onOpen: (p: AnimalProduct) => void;
  renderActions: (p: AnimalProduct) => ReactNode;
  /** Show only the newest n weeks until "Ältere Wochen anzeigen" is pressed. */
  initialWeeks?: number;
}

/**
 * Production records condensed to one row per week ("KW 41 · 15 Eier"),
 * grouped by month; a week opens to its single entries for editing. Used by
 * the production page and the animal detail, so daily egg counts never turn
 * into a wall of 30 identical rows.
 */
export function ProductWeekList({ products, entryMeta, onOpen, renderActions, initialWeeks }: Props) {
  const { t } = useTranslation();
  const f = useFormat();
  const [openWeeks, setOpenWeeks] = useState<Set<string>>(() => new Set());
  const toggle = (key: string) => setOpenWeeks((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
  const typeCount = new Set(products.map((p) => p.type)).size;
  const [showAll, setShowAll] = useState(false);
  const allWeeks = groupByWeek(products);
  // Cut after whole months only: a month card never shows part of its weeks,
  // so its header total always matches the rows under it.
  const weeks = (() => {
    if (initialWeeks === undefined || showAll || allWeeks.length <= initialWeeks) return allWeeks;
    const months = weeksByMonth(allWeeks);
    const out: typeof allWeeks = [];
    for (const m of months) {
      if (out.length >= initialWeeks) break;
      out.push(...m.weeks);
    }
    return out;
  })();
  const hiddenWeeks = allWeeks.length - weeks.length;
  // The header adds up exactly the weeks listed under it (ISO weeks belong to
  // the month of their Thursday), over all weeks — also those behind
  // "Ältere Wochen anzeigen" — so header and rows always agree.
  const fullMonths = new Map(weeksByMonth(allWeeks).map((m) => [m.key, m.weeks]));
  const monthTotal = (key: string, ty: (typeof PRODUCT_TYPES)[number]) =>
    (fullMonths.get(key) ?? []).reduce((s, w) => s + w.totals[ty], 0);

  return (
    <div className="space-y-3">
      {weeksByMonth(weeks).map((g) => (
        // Month total right-aligned, the same pattern as Futter, Ernte and Bewässerung.
        <List
          key={g.key}
          header={
            <span className="flex items-center justify-between gap-2">
              {/* The week span says why this total may differ from the calendar-month chart. */}
              <span>
                {f.formatDate(g.date, "monthYear")}
                {(() => {
                  const ws = (fullMonths.get(g.key) ?? g.weeks).map((w) => w.week);
                  return ws.length > 0 ? <span className="font-normal normal-case"> · {t("livestock.weekSpan", { from: Math.min(...ws), to: Math.max(...ws) })}</span> : null;
                })()}
              </span>
              <span className="font-medium tabular-nums">
                {PRODUCT_TYPES.filter((ty) => monthTotal(g.key, ty) > 0)
                  .map((ty) => {
                    const sum = monthTotal(g.key, ty);
                    return formatProductAmount(ty, sum, f, t) + (typeCount > 1 && ty !== "eggs" ? ` ${t(`livestock.products.${ty}`)}` : "");
                  })
                  .join(" · ")}
              </span>
            </span>
          }
        >
          {g.weeks.map((w) => {
            const open = openWeeks.has(w.key);
            const present = PRODUCT_TYPES.filter((ty) => w.totals[ty] > 0);
            const sums = present.map((ty) => formatProductAmount(ty, w.totals[ty], f, t) + (typeCount > 1 && ty !== "eggs" ? ` ${t(`livestock.products.${ty}`)}` : ""));
            const weekTitle = `${t("livestock.weekShort", { week: w.week })} · ${sums.join(" · ")}`;
            return (
              <Fragment key={w.key}>
                <ListRow
                  leading={<IconTile icon={PRODUCT_ICON[present[0] ?? "eggs"]} />}
                  title={weekTitle}
                  meta={[f.formatDateRange(w.from, w.to), t("livestock.entriesHint", { count: w.items.length })]}
                  clickLabel={`${weekTitle} – ${t(open ? "livestock.hideEntries" : "livestock.showEntries")}`}
                  onClick={() => toggle(w.key)}
                  // A disclosure, not a link: the week folds open to its single entries.
                  trailing={<ChevronDown size={18} aria-hidden="true" className={`text-gray-400 transition-transform dark:text-gray-500 ${open ? "rotate-180" : ""}`} />}
                />
                {open && w.items.map((p) => (
                  <ListRow
                    key={p.id}
                    className="pl-8 sm:pl-10"
                    leading={<IconTile icon={PRODUCT_ICON[p.type]} />}
                    title={formatProductAmount(p.type, p.unit === "g" ? p.quantity / 1000 : p.quantity, f, t)}
                    meta={[typeCount > 1 ? t(`livestock.products.${p.type}`) : null, entryMeta?.(p) ?? null, f.formatDate(p.date, "relative")]}
                    description={p.notes}
                    onClick={() => onOpen(p)}
                    actions={renderActions(p)}
                  />
                ))}
              </Fragment>
            );
          })}
        </List>
      ))}
      {hiddenWeeks > 0 && (
        // Same control as "Ältere Monate/Wochen anzeigen" on Ernte and Bewässerung.
        <Button variant="secondary" onClick={() => setShowAll(true)}>{t("water.showOlder")}</Button>
      )}
    </div>
  );
}
