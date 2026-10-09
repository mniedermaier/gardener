import { Fragment, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { endOfWeek, getISOWeek, startOfWeek } from "date-fns";
import { useFormat } from "@/hooks/useFormat";
import { toDate, toISODate } from "@/lib/format";
import { PRODUCT_TYPES, type ProductTotals } from "@/lib/metrics";
import type { AnimalProduct } from "@/types/animal";
import { List, ListRow } from "@/components/ui/List";
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

/** Weeks grouped by the month their Monday falls in — a week is never split across two cards. */
export function weeksByMonth(weeks: ProductWeek[]): { key: string; date: Date; count: number; weeks: ProductWeek[] }[] {
  const out: { key: string; date: Date; count: number; weeks: ProductWeek[] }[] = [];
  for (const w of weeks) {
    const key = toISODate(w.from).slice(0, 7);
    let g = out.find((x) => x.key === key);
    if (!g) {
      g = { key, date: w.from, count: 0, weeks: [] };
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
}

/**
 * Production records condensed to one row per week ("KW 41 · 15 Eier"),
 * grouped by month; a week opens to its single entries for editing. Used by
 * the production page and the animal detail, so daily egg counts never turn
 * into a wall of 30 identical rows.
 */
export function ProductWeekList({ products, entryMeta, onOpen, renderActions }: Props) {
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

  return (
    <div className="space-y-3">
      {weeksByMonth(groupByWeek(products)).map((g) => (
        <List key={g.key} header={`${f.formatDate(g.date, "monthYear")} · ${t("livestock.entriesHint", { count: g.count })}`}>
          {g.weeks.map((w) => {
            const open = openWeeks.has(w.key);
            const sums = PRODUCT_TYPES.filter((ty) => w.totals[ty] > 0).map((ty) => formatProductAmount(ty, w.totals[ty], f, t) + (typeCount > 1 && ty !== "eggs" ? ` ${t(`livestock.products.${ty}`)}` : ""));
            const weekTitle = `${t("livestock.weekShort", { week: w.week })} · ${sums.join(" · ")}`;
            return (
              <Fragment key={w.key}>
                <ListRow
                  leading={<IconTile icon={open ? ChevronDown : ChevronRight} />}
                  title={weekTitle}
                  meta={[`${f.formatDate(w.from, "short")} – ${f.formatDate(w.to, "short")}`, t("livestock.entriesHint", { count: w.items.length })]}
                  clickLabel={`${weekTitle} – ${t(open ? "livestock.hideEntries" : "livestock.showEntries")}`}
                  onClick={() => toggle(w.key)}
                  trailing={null}
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
    </div>
  );
}
