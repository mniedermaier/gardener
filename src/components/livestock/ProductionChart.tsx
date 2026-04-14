import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AnimalProduct, Animal, ProductType } from "@/types/animal";
import { PRODUCT_ICONS } from "@/types/animal";

interface ProductionChartProps {
  animalProducts: AnimalProduct[];
  animals: Animal[];
  months?: number;
}

const PRODUCT_COLORS: Record<ProductType, { bg: string; bar: string }> = {
  eggs: { bg: "bg-amber-400", bar: "bg-amber-400 dark:bg-amber-500" },
  honey: { bg: "bg-yellow-300", bar: "bg-yellow-300 dark:bg-yellow-400" },
  meat: { bg: "bg-red-400", bar: "bg-red-400 dark:bg-red-500" },
  wax: { bg: "bg-gray-400", bar: "bg-gray-400 dark:bg-gray-500" },
  milk: { bg: "bg-blue-300", bar: "bg-blue-300 dark:bg-blue-400" },
  wool: { bg: "bg-purple-400", bar: "bg-purple-400 dark:bg-purple-500" },
};

const PRODUCT_ORDER: ProductType[] = ["eggs", "honey", "milk", "meat", "wool", "wax"];

interface MonthData {
  key: string;
  label: string;
  totals: Record<ProductType, number>;
  total: number;
}

export function ProductionChart({ animalProducts, animals: _animals, months = 6 }: ProductionChartProps) {
  const { t } = useTranslation();
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const monthData = useMemo(() => {
    const now = new Date();
    const result: MonthData[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;

      const monthProducts = animalProducts.filter((p) => {
        const pDate = new Date(p.date);
        return pDate.getFullYear() === year && pDate.getMonth() === month;
      });

      const totals: Record<ProductType, number> = { eggs: 0, honey: 0, meat: 0, wax: 0, milk: 0, wool: 0 };
      for (const p of monthProducts) {
        totals[p.type] += p.quantity;
      }

      const total = PRODUCT_ORDER.reduce((sum, type) => sum + totals[type], 0);

      const label = d.toLocaleDateString(undefined, { month: "short" });

      result.push({ key, label, totals, total });
    }

    return result;
  }, [animalProducts, months]);

  const maxTotal = useMemo(() => {
    return Math.max(...monthData.map((m) => m.total), 1);
  }, [monthData]);

  const hasData = monthData.some((m) => m.total > 0);

  if (!hasData) {
    return (
      <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
        {t("livestock.noChartData")}
      </p>
    );
  }

  const activeProducts = PRODUCT_ORDER.filter((type) =>
    monthData.some((m) => m.totals[type] > 0)
  );

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
        {t("livestock.chartTitle")}
      </h3>

      {/* Chart area */}
      <div className="flex items-end gap-2" style={{ height: "160px" }}>
        {monthData.map((m) => {
          const barHeight = m.total > 0 ? (m.total / maxTotal) * 100 : 0;
          return (
            <div
              key={m.key}
              className="relative flex flex-1 flex-col items-center justify-end"
              style={{ height: "100%" }}
              onMouseEnter={() => setHoveredMonth(m.key)}
              onMouseLeave={() => setHoveredMonth(null)}
            >
              {/* Tooltip */}
              {hoveredMonth === m.key && m.total > 0 && (
                <div className="absolute -top-2 z-10 -translate-y-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {activeProducts.map((type) =>
                    m.totals[type] > 0 ? (
                      <div key={type} className="flex items-center gap-1.5 whitespace-nowrap">
                        <span>{PRODUCT_ICONS[type]}</span>
                        <span className="text-gray-600 dark:text-gray-300">
                          {t(`livestock.products.${type}`)}:
                        </span>
                        <span className="font-medium">{Math.round(m.totals[type] * 10) / 10}</span>
                      </div>
                    ) : null
                  )}
                </div>
              )}

              {/* Stacked bar */}
              <div
                className="flex w-full max-w-[48px] flex-col-reverse overflow-hidden rounded-t"
                style={{ height: `${barHeight}%`, minHeight: m.total > 0 ? "4px" : "0" }}
              >
                {activeProducts.map((type) => {
                  const segment = m.totals[type];
                  if (segment <= 0) return null;
                  const segmentPct = (segment / m.total) * 100;
                  return (
                    <div
                      key={type}
                      className={`w-full ${PRODUCT_COLORS[type].bar}`}
                      style={{ height: `${segmentPct}%`, minHeight: "2px" }}
                    />
                  );
                })}
              </div>

              {/* Month label */}
              <span className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                {m.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3">
        {activeProducts.map((type) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <div className={`h-2.5 w-2.5 rounded-sm ${PRODUCT_COLORS[type].bg}`} />
            <span>{t(`livestock.products.${type}`)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
