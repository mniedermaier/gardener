import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, Ruler, Scale, ShoppingBasket, Target } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { useAnalysisPrefs } from "@/store/analysisPrefs";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { getCropPlan, getForecastProducts, PRODUCT_TYPES } from "@/lib/metrics";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { List, ListRow } from "@/components/ui/List";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { HowCalculated, Legend, Meter } from "@/components/ui/charts";
import { HouseholdSizeField } from "@/components/sufficiency/HouseholdSizeField";
import { PRODUCT_ICON } from "@/components/livestock/icons";
import { IconTile, formatProductAmount } from "@/components/livestock/shared";

export function FoodPlan() {
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();
  const { gardens, gridCellSizeCm, harvests, animals } = useStore(
    useShallow((s) => ({ gardens: s.gardens, gridCellSizeCm: s.gridCellSizeCm, harvests: s.harvests, animals: s.animals })),
  );
  const householdSize = useAnalysisPrefs((s) => s.householdSize);
  const plantMap = usePlantMap();
  const plantName = usePlantName();
  const year = new Date().getFullYear();

  const plan = useMemo(
    () => getCropPlan({ gardens, plants: plantMap, gridCellSizeCm, harvests, householdSize, period: year }),
    [gardens, plantMap, gridCellSizeCm, harvests, householdSize, year],
  );
  const animalForecast = useMemo(() => getForecastProducts(animals), [animals]);
  const deficits = plan.rows.filter((r) => r.deficitKg > 0.05);
  const hasPlantings = gardens.some((g) => g.beds.some((b) => b.cells.length > 0));
  const kg = (v: number) => f.formatWeight(v * 1000, "kg");

  return (
    <div>
      <PageHeader title={t("foodplan.title")} description={t("foodplan.subtitle")} actions={<HouseholdSizeField />} />

      {!hasPlantings && animals.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title={t("foodplan.emptyTitle")}
            description={t("foodplan.emptyText", { kg: kg(plan.targetKg) })}
            action={<Button onClick={() => navigate("/planner")}><LayoutGrid size={16} aria-hidden="true" />{t("sufficiency.toPlanner")}</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={t("foodplan.coverageForecast")} value={f.formatPercent(plan.forecastCoverage)} icon={Target} tone="brand" hint={t("foodplan.ofTarget", { kg: kg(plan.targetKg) })} />
            <StatCard label={t("foodplan.coverageActual")} value={f.formatPercent(plan.actualCoverage)} icon={Scale} tone="neutral" hint={t("foodplan.actualKg", { kg: kg(plan.actualKg) })} />
            <StatCard label={t("foodplan.area")} value={f.formatArea(plan.areaM2)} icon={Ruler} tone="neutral" hint={t("foodplan.areaNeeded", { area: f.formatArea(plan.neededAreaM2) })} />
            <StatCard label={t("foodplan.deficits")} value={f.formatNumber(deficits.length, { maximumFractionDigits: 0 })} icon={ShoppingBasket} tone="neutral" hint={t("foodplan.ofCrops", { count: plan.rows.length })} />
          </div>
          <HowCalculated>
            <p>{t("foodplan.howTargets")}</p>
            <p>{t("foodplan.howCoverage")}</p>
            <p>{t("metrics.howActual")}</p>
          </HowCalculated>

          {deficits.length > 0 && (
            <Card padding="none">
              <div className="px-4 pt-4 sm:px-6 sm:pt-5"><CardHeader title={t("foodplan.deficitsTitle")} description={t("foodplan.deficitsDesc")} /></div>
              <ul className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-white/5 dark:border-white/5">
                {deficits.slice(0, 5).map((r) => {
                  const p = plantMap.get(r.plantId)!;
                  return (
                    <li key={r.plantId} className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
                      <PlantIconDisplay plantId={p.id} emoji={p.icon} size={28} />
                      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{plantName(p.id)}</span>
                      <span className="text-right text-sm tabular-nums text-gray-700 dark:text-gray-300">
                        {t("foodplan.missing", { kg: kg(r.deficitKg) })}
                        <span className="block text-xs text-gray-500 dark:text-gray-400">{t("foodplan.extraArea", { area: f.formatArea(r.extraAreaM2) })}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <section aria-labelledby="crop-plan" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 id="crop-plan" className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t("foodplan.cropPlan")}</h2>
              <Legend
                items={[
                  { label: t("metrics.actual"), color: "brand" },
                  { label: t("metrics.forecast"), color: "brand", swatch: "hatched" },
                  { label: t("foodplan.target"), color: "muted", swatch: "line" },
                ]}
              />
            </div>
            <List label={t("foodplan.cropPlan")}>
              {plan.rows.map((r) => {
                const p = plantMap.get(r.plantId)!;
                const ratio = r.targetKg > 0 ? Math.min(1, r.forecastKg / r.targetKg) : 0;
                const actualRatio = r.targetKg > 0 ? Math.min(1, r.actualKg / r.targetKg) : 0;
                return (
                  <ListRow
                    key={r.plantId}
                    leading={<PlantIconDisplay plantId={p.id} emoji={p.icon} size={28} />}
                    title={plantName(p.id)}
                    badges={Math.max(ratio, actualRatio) >= 1 ? <Badge tone="positive">{t("foodplan.covered")}</Badge> : r.areaM2 === 0 ? <Badge variant="outline">{t("foodplan.notPlanted")}</Badge> : undefined}
                    meta={t("foodplan.rowMeta", { actual: kg(r.actualKg), forecast: kg(r.forecastKg), target: kg(r.targetKg), area: f.formatArea(r.areaM2), needed: f.formatArea(r.neededAreaM2) })}
                    description={
                      <Meter
                        className="mt-1.5"
                        size={6}
                        actual={r.actualKg}
                        forecast={r.forecastKg}
                        max={Math.max(r.targetKg, r.forecastKg, r.actualKg)}
                        target={r.targetKg}
                        label={t("foodplan.meterLabel", { plant: plantName(p.id), actual: kg(r.actualKg), forecast: kg(r.forecastKg), target: kg(r.targetKg) })}
                      />
                    }
                    trailing={
                      <span className="block text-right text-xs leading-5 text-gray-500 dark:text-gray-400">
                        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{t("foodplan.pctActual", { percent: f.formatPercent(actualRatio) })}</span>
                        {t("foodplan.pctForecast", { percent: f.formatPercent(ratio) })}
                      </span>
                    }
                  />
                );
              })}
            </List>
          </section>

          {animals.length > 0 && (
            <section aria-labelledby="animal-products" className="space-y-3">
              <h2 id="animal-products" className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t("foodplan.animalProducts")}</h2>
              <List label={t("foodplan.animalProducts")}>
                {PRODUCT_TYPES.filter((ty) => animalForecast[ty] > 0).map((ty) => (
                  <ListRow
                    key={ty}
                    leading={<IconTile icon={PRODUCT_ICON[ty]} />}
                    title={t(`livestock.products.${ty}`)}
                    meta={t("foodplan.animalMeta")}
                    trailing={t("sufficiency.perYear", { amount: formatProductAmount(ty, animalForecast[ty], f, t) })}
                  />
                ))}
              </List>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
