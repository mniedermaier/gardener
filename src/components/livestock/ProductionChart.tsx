import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { AnimalProduct, ProductType } from "@/types/animal";
import { useFormat } from "@/hooks/useFormat";
import { BarChart } from "@/components/ui/charts";
import { PRODUCT_TYPES } from "@/lib/metrics";
import { formatProductAmount } from "./shared";
import { PRODUCT_ICON } from "./icons";
import { useToday } from "@/hooks/useToday";

/** Fewest months a chart shows, even for a herd that is only weeks old. */
const MIN_MONTHS = 3;

/** Index of the first month with a value, keeping at least MIN_MONTHS bars. */
function chartStart(values: number[]): number {
  const first = values.findIndex((v) => v > 0);
  return first < 0 ? 0 : Math.max(0, Math.min(first, values.length - MIN_MONTHS));
}

interface ProductionChartProps {
  animalProducts: AnimalProduct[];
  months?: number;
  /**
   * Entries that set the first month shown (default: `animalProducts`). The
   * herd detail passes all entries so its chart spans the same months as the
   * Produktion page.
   */
  rangeProducts?: AnimalProduct[];
}

/**
 * Production per month as small multiples: one chart per product, each with
 * its own unit (eggs are counted, honey is weighed) — never stacked on one axis.
 */
export function ProductionChart({ animalProducts, months = 6, rangeProducts }: ProductionChartProps) {
  const now = useToday();
  const { t } = useTranslation();
  const f = useFormat();

  const { buckets, perType } = useMemo(() => {
    const all = Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, date: d };
    });
    const index = new Map(all.map((b, i) => [b.key, i]));
    const full = new Map<ProductType, number[]>();
    for (const p of animalProducts) {
      const i = index.get(p.date.slice(0, 7));
      if (i === undefined) continue;
      const arr = full.get(p.type) ?? Array.from({ length: months }, () => 0);
      arr[i] += p.unit === "g" ? p.quantity / 1000 : p.quantity;
      full.set(p.type, arr);
    }
    // Start at the first month with any entry (but show at least 3 months):
    // a herd that arrived in August should not get nine empty bars.
    let first = months - 1;
    for (const p of rangeProducts ?? animalProducts) {
      const i = index.get(p.date.slice(0, 7));
      if (i !== undefined && p.quantity > 0) first = Math.min(first, i);
    }
    const start = Math.max(0, Math.min(first, months - MIN_MONTHS));
    const perType = new Map([...full].map(([ty, arr]) => [ty, arr.slice(start)] as const));
    return { buckets: all.slice(start), perType };
  }, [now, animalProducts, months, rangeProducts]);
  const shown = buckets.length;

  const present = PRODUCT_TYPES.filter((ty) => perType.get(ty)?.some((v) => v > 0));
  if (present.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">{t("livestock.noChartData")}</p>;
  }
  // A chart needs a course: products harvested in one or two months only (honey, wax) are listed instead.
  const types = present.filter((ty) => perType.get(ty)!.filter((v) => v > 0).length >= 3);
  const sparse = present.filter((ty) => !types.includes(ty));

  const charts = types.length > 0 && (
    <div className={`grid gap-6 ${types.length > 1 ? "lg:grid-cols-2" : ""}`}>
      {types.map((type) => {
        // Each chart starts at its own first month with a value: honey logged in
        // July must not leave an empty July column in the egg chart.
        const from = chartStart(perType.get(type)!);
        const values = perType.get(type)!.slice(from);
        const chartBuckets = buckets.slice(from);
        const Icon = PRODUCT_ICON[type];
        const total = values.reduce((s, v) => s + v, 0);
        const fmt = (v: number) => formatProductAmount(type, v, f, t);
        const tick = (v: number) => (type === "eggs" ? f.formatNumber(v, { maximumFractionDigits: 0 }) : type === "milk" ? f.formatVolume(v) : f.formatWeight(v * 1000, "kg"));
        const name = t(`livestock.products.${type}`);
        return (
          <div key={type} className="min-w-0">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <Icon size={16} aria-hidden="true" className="text-gray-500 dark:text-gray-400" />
              {name}
              <span className="font-normal text-gray-500 dark:text-gray-400">· {t("livestock.chartUnit", { unit: t(`livestock.unitPerMonth.${type}`) })}</span>
            </h3>
            <BarChart
              data={chartBuckets.map((b, i) => ({
                key: b.key,
                label: f.formatDate(b.date, "month"),
                fullLabel: f.formatDate(b.date, "monthYear"),
                values: [values[i]],
              }))}
              series={[{ label: name, color: "brand" }]}
              formatValue={fmt}
              formatTick={tick}
              marker={{ index: chartBuckets.length - 1, label: t("charts.today") }}
              caption={t("livestock.chartCaption", { product: name, months: chartBuckets.length, total: fmt(total) })}
              categoryLabel={t("charts.month")}
              height={150}
            />
          </div>
        );
      })}
    </div>
  );

  // Rare harvests (honey, wax) as rows: product, month as meta, amount right-aligned.
  const sparseList = sparse.length > 0 && (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t("livestock.singleEntries")}</h3>
      <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{t("livestock.singleEntriesRange", { count: shown })}</p>
      <ul className="divide-y divide-gray-100 text-sm dark:divide-white/5">
        {sparse.flatMap((type) => {
          const Icon = PRODUCT_ICON[type];
          const values = perType.get(type)!;
          return buckets
            .map((b, i) => ({ b, v: values[i] }))
            .filter((x) => x.v > 0)
            .map(({ b, v }) => (
              <li key={`${type}-${b.key}`} className="flex items-center gap-3 py-2">
                <Icon size={16} aria-hidden="true" className="shrink-0 text-gray-500 dark:text-gray-400" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-gray-900 dark:text-gray-100">{t(`livestock.products.${type}`)}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{f.formatDate(b.date, "monthYear")}</span>
                </span>
                <span className="shrink-0 font-medium text-gray-900 tabular-nums dark:text-gray-100">{formatProductAmount(type, v, f, t)}</span>
              </li>
            ));
        })}
      </ul>
    </div>
  );

  // One chart over few months: a full-width card would stretch three bars
  // over 1000 px, a capped chart leaves the card half empty. The chart takes
  // the left column; the right one carries the single entries, or a short
  // summary (average and best month) — never the bar values again.
  const single = types.length === 1 && shown < 6;
  if (!single) {
    return (
      <div className="space-y-6">
        {charts}
        {sparseList}
      </div>
    );
  }
  const type = types[0];
  const from = chartStart(perType.get(type)!);
  const values = perType.get(type)!.slice(from);
  const summaryBuckets = buckets.slice(from);
  // The current month is still running: the average uses full months only and names them.
  const full = values.slice(0, -1).map((v, i) => ({ v, b: summaryBuckets[i] })).filter((x) => x.v > 0);
  const withData = full.length > 0 ? full : values.map((v, i) => ({ v, b: summaryBuckets[i] })).filter((x) => x.v > 0);
  const avg = withData.length > 0 ? withData.reduce((sum, x) => sum + x.v, 0) / withData.length : 0;
  const avgRange = withData.length > 1
    ? `${f.formatDate(withData[0].b.date, "month")}–${f.formatDate(withData[withData.length - 1].b.date, "month")}`
    : withData.length === 1 ? f.formatDate(withData[0].b.date, "monthYear") : "";
  const best = values.reduce((bi, v, i, a) => (v > a[bi] ? i : bi), 0);
  // With single entries (honey, wax) the list sits beside the chart.
  if (sparseList) {
    return (
      <div className={`grid gap-6 lg:gap-8 ${values.length <= 4 ? "lg:grid-cols-[minmax(0,24rem)_1fr]" : "lg:grid-cols-[minmax(0,36rem)_1fr]"}`}>
        {charts}
        {sparseList}
      </div>
    );
  }
  // Otherwise the figures sit above a full-width chart (like the production
  // page), and the first entry is named: the herd is older than its records.
  const firstEntry = animalProducts.reduce<string | null>((min, p) => (min === null || p.date < min ? p.date : min), null);
  const showSummary = values.filter((v) => v > 0).length > 1;
  return (
    <div className="space-y-4">
      {(showSummary || firstEntry) && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:flex sm:gap-10">
          {showSummary && (
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">{t("livestock.monthAvgLabel")}</dt>
              <dd className="text-xl font-semibold text-gray-900 tabular-nums dark:text-gray-100">
                {formatProductAmount(type, avg, f, t)}
                {avgRange && <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">{avgRange}</span>}
              </dd>
            </div>
          )}
          {showSummary && (
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">{t("livestock.bestMonth")}</dt>
              <dd className="text-xl font-semibold text-gray-900 tabular-nums dark:text-gray-100">
                {formatProductAmount(type, values[best], f, t)}
                <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">{f.formatDate(summaryBuckets[best].date, "monthYear")}</span>
              </dd>
            </div>
          )}
          {firstEntry && (
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">{t("livestock.firstEntry")}</dt>
              <dd className="text-xl font-semibold text-gray-900 tabular-nums dark:text-gray-100">{f.formatDate(firstEntry, "date")}</dd>
            </div>
          )}
        </dl>
      )}
      {charts}
    </div>
  );
}
