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

interface ProductionChartProps {
  animalProducts: AnimalProduct[];
  months?: number;
}

/**
 * Production per month as small multiples: one chart per product, each with
 * its own unit (eggs are counted, honey is weighed) — never stacked on one axis.
 */
export function ProductionChart({ animalProducts, months = 6 }: ProductionChartProps) {
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
    for (const arr of full.values()) {
      const i = arr.findIndex((v) => v > 0);
      if (i >= 0) first = Math.min(first, i);
    }
    const start = Math.max(0, Math.min(first, months - MIN_MONTHS));
    const perType = new Map([...full].map(([ty, arr]) => [ty, arr.slice(start)] as const));
    return { buckets: all.slice(start), perType };
  }, [now, animalProducts, months]);
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
        const values = perType.get(type)!;
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
              data={buckets.map((b, i) => ({
                key: b.key,
                label: f.formatDate(b.date, "month"),
                fullLabel: f.formatDate(b.date, "monthYear"),
                values: [values[i]],
              }))}
              series={[{ label: name, color: "brand" }]}
              formatValue={fmt}
              formatTick={tick}
              marker={{ index: buckets.length - 1, label: t("charts.today") }}
              caption={t("livestock.chartCaption", { product: name, months: shown, total: fmt(total) })}
              categoryLabel={t("charts.month")}
              height={150}
            />
          </div>
        );
      })}
    </div>
  );

  const sparseList = sparse.length > 0 && (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{t("livestock.singleHarvests", { months: shown })}</h3>
      <ul className="divide-y divide-gray-100 text-sm dark:divide-white/5">
        {sparse.map((type) => {
          const Icon = PRODUCT_ICON[type];
          const values = perType.get(type)!;
          const entries = buckets
            .map((b, i) => ({ b, v: values[i] }))
            .filter((x) => x.v > 0)
            .map((x) => `${formatProductAmount(type, x.v, f, t)} (${f.formatDate(x.b.date, "monthYear")})`);
          return (
            <li key={type} className="flex items-start gap-2 py-2">
              <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-500 dark:text-gray-400" />
              <span className="min-w-0">
                <span className="font-medium text-gray-900 dark:text-gray-100">{t(`livestock.products.${type}`)}</span>{" "}
                <span className="text-gray-600 tabular-nums dark:text-gray-300">{entries.join(", ")}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );

  // One chart over few months: a full-width card would stretch three bars
  // over 1000 px, a capped chart leaves the card half empty. The chart takes
  // the left column and the right one carries the figures behind it — the
  // single entries, or the month values with their average.
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
  const values = perType.get(type)!;
  const withData = values.filter((v) => v > 0);
  const avg = withData.length > 0 ? withData.reduce((s, v) => s + v, 0) / withData.length : 0;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,36rem)_1fr] lg:gap-8">
      {charts}
      {sparseList || (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{t("livestock.monthValues")}</h3>
          <ul className="divide-y divide-gray-100 text-sm dark:divide-white/5">
            {buckets.map((b, i) => (
              <li key={b.key} className="flex items-center justify-between gap-3 py-2">
                <span className="text-gray-700 dark:text-gray-300">{f.formatDate(b.date, "monthYear")}</span>
                <span className="font-medium text-gray-900 tabular-nums dark:text-gray-100">{formatProductAmount(type, values[i], f, t)}</span>
              </li>
            ))}
          </ul>
          {withData.length > 1 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t("livestock.monthAvg", { amount: formatProductAmount(type, avg, f, t) })}</p>
          )}
        </div>
      )}
    </div>
  );
}
