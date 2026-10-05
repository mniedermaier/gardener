import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { AnimalProduct, ProductType } from "@/types/animal";
import { useFormat } from "@/hooks/useFormat";
import { BarChart } from "@/components/ui/charts";
import { PRODUCT_TYPES } from "@/lib/metrics";
import { formatProductAmount } from "./shared";
import { PRODUCT_ICON } from "./icons";

interface ProductionChartProps {
  animalProducts: AnimalProduct[];
  months?: number;
}

/**
 * Production per month as small multiples: one chart per product, each with
 * its own unit (eggs are counted, honey is weighed) — never stacked on one axis.
 */
export function ProductionChart({ animalProducts, months = 6 }: ProductionChartProps) {
  const { t } = useTranslation();
  const f = useFormat();

  const { buckets, perType } = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, date: d };
    });
    const index = new Map(buckets.map((b, i) => [b.key, i]));
    const perType = new Map<ProductType, number[]>();
    for (const p of animalProducts) {
      const i = index.get(p.date.slice(0, 7));
      if (i === undefined) continue;
      const arr = perType.get(p.type) ?? Array.from({ length: months }, () => 0);
      arr[i] += p.unit === "g" ? p.quantity / 1000 : p.quantity;
      perType.set(p.type, arr);
    }
    return { buckets, perType };
  }, [animalProducts, months]);

  const types = PRODUCT_TYPES.filter((ty) => perType.get(ty)?.some((v) => v > 0));
  if (types.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">{t("livestock.noChartData")}</p>;
  }

  return (
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
              marker={{ index: buckets.length - 1, label: t("charts.now") }}
              caption={t("livestock.chartCaption", { product: name, months, total: fmt(total) })}
              categoryLabel={t("charts.month")}
              height={150}
            />
          </div>
        );
      })}
    </div>
  );
}
