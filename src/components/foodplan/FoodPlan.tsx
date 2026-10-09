import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useGardenMetrics } from "@/hooks/useGardenMetrics";
import { ChevronDown, LayoutGrid, Target } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { useAnalysisPrefs } from "@/store/analysisPrefs";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { ANNUAL_CONSUMPTION_KG_PER_PERSON, EGG_WEIGHT_KG, getCropPlan, getForecastProducts, PRODUCT_TYPES } from "@/lib/metrics";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { List, ListRow } from "@/components/ui/List";
import { Badge } from "@/components/ui/Badge";
import { HowCalculated, KeyFigures, Legend, Meter } from "@/components/ui/charts";
import { HouseholdSizeField } from "@/components/sufficiency/HouseholdSizeField";
import { PRODUCT_ICON } from "@/components/livestock/icons";
import { IconTile, formatProductAmount } from "@/components/livestock/shared";
import { useToday } from "@/hooks/useToday";

/** A crop whose forecast reaches less than this share of its target gets "Große Lücke". */
const BIG_GAP_SHARE = 0.25;

export function FoodPlan() {
  const now = useToday();
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();
  const { gardens, gridCellSizeCm, harvests, animals } = useStore(
    useShallow((s) => ({ gardens: s.gardens, gridCellSizeCm: s.gridCellSizeCm, harvests: s.harvests, animals: s.animals })),
  );
  const householdSize = useAnalysisPrefs((s) => s.householdSize);
  const plantMap = usePlantMap();
  const plantName = usePlantName();
  const year = now.getFullYear();

  const plan = useMemo(
    () => getCropPlan({ gardens, plants: plantMap, gridCellSizeCm, harvests, householdSize, period: year }),
    [gardens, plantMap, gridCellSizeCm, harvests, householdSize, year],
  );
  const { selfSufficiency } = useGardenMetrics();
  // Rows are sorted by gap: the first three qualifying crops get "Große Lücke".
  const bigGapIds = new Set(plan.rows.filter((r) => r.deficitKg > 0.05 && r.targetKg > 0 && r.forecastKg < r.targetKg * BIG_GAP_SHARE).slice(0, 3).map((r) => r.plantId));
  const animalForecast = useMemo(() => getForecastProducts(animals), [animals]);
  const deficits = plan.rows.filter((r) => r.deficitKg > 0.05);
  // Crops with neither area nor harvest: collapsed into one group instead of
  // a dozen "0 kg · 0 %" rows.
  const isUnplanted = (r: (typeof plan.rows)[number]) => r.areaM2 === 0 && r.actualKg === 0;
  const grown = plan.rows.filter((r) => !isUnplanted(r));
  const unplanted = plan.rows.filter(isUnplanted);
  const unplantedArea = unplanted.reduce((sum, r) => sum + r.neededAreaM2, 0);
  const hasPlantings = gardens.some((g) => g.beds.some((b) => b.cells.length > 0));
  const kg = (v: number) => f.formatWeight(v * 1000, "kg");
  const empty = !hasPlantings && animals.length === 0;
  // Meter draws the target tick only when the bar's scale exceeds the target.
  const targetTickShown = grown.some((r) => r.targetKg > 0 && Math.max(r.forecastKg, r.actualKg) > r.targetKg);

  return (
    <div>
      <PageHeader title={t("foodplan.title")} description={t("foodplan.subtitle")} actions={<HouseholdSizeField />} />

      <div className="space-y-6">
        {/* Nothing planted yet: the targets per crop are the useful part, so they stay;
            only the 0 % figures give way to a slim hint. */}
        {empty ? (
          // The need is known before anything grows: it is the page's figure,
          // and the one way forward (a first bed) sits right under it.
          <div className="space-y-3">
          <KeyFigures
            hero={{
              label: t("foodplan.annualNeed"),
              value: kg(plan.targetKg),
              icon: Target,
              tone: "brand",
              hint: t("foodplan.annualNeedHint", { count: householdSize }),
            }}
            items={[
              { label: t("foodplan.areaNeededLabel"), value: f.formatArea(plan.neededAreaM2), hint: t("foodplan.areaNeededHint") },
            ]}
          />
          <div className="flex flex-col gap-3 rounded-xl border border-garden-200 bg-garden-50 p-4 sm:flex-row sm:items-center dark:border-garden-500/30 dark:bg-garden-500/10">
            <p className="min-w-0 flex-1 text-sm text-gray-700 dark:text-gray-300">{t("foodplan.emptyCta")}</p>
            <Button onClick={() => navigate("/planner")} className="shrink-0">
              <LayoutGrid size={16} aria-hidden="true" />
              {t("planner.addBed")}
            </Button>
          </div>
          </div>
        ) : (
          <div>
            <KeyFigures
              hero={{
                label: t("foodplan.coverageForecast"),
                value: f.formatPercent(plan.forecastCoverage),
                icon: Target,
                tone: "brand",
                visual: (
                  <Meter
                    actual={Math.min(1, plan.actualCoverage)}
                    forecast={Math.min(1, plan.forecastCoverage)}
                    max={1}
                    label={t("metrics.actualVsForecast", { actual: f.formatPercent(plan.actualCoverage), forecast: f.formatPercent(plan.forecastCoverage) })}
                  />
                ),
                hint: (
                  <>
                    {t("foodplan.ofTarget", { kg: kg(plan.targetKg) })}
                    {/* The other headline percentage (calories, with animals) is one tap away. */}
                    <Link to="/sufficiency" className="mt-0.5 block font-medium text-garden-700 hover:underline dark:text-garden-300">
                      {t("foodplan.byCalories", { value: f.formatPercent(selfSufficiency.forecastRatio, 1) })}
                    </Link>
                  </>
                ),
              }}
              items={[
                { label: t("foodplan.coverageActual"), value: f.formatPercent(plan.actualCoverage), hint: t("foodplan.actualKg", { kg: kg(plan.actualKg) }) },
                { label: t("foodplan.area"), value: f.formatArea(plan.areaM2), hint: t("foodplan.areaNeeded", { area: f.formatArea(plan.neededAreaM2) }) },
                // "20 von 20 Kulturen mit Lücke" says nothing and the largest gap is the
                // first row of "Hier fehlt am meisten": the crops not grown at all are
                // the figure the plan below acts on.
                unplanted.length > 0
                  ? { label: t("foodplan.unplanted"), value: f.formatNumber(unplanted.length, { maximumFractionDigits: 0 }), hint: t("foodplan.ofCrops", { count: plan.rows.length }) }
                  : { label: t("foodplan.deficits"), value: f.formatNumber(deficits.length, { maximumFractionDigits: 0 }), hint: t("foodplan.ofCrops", { count: plan.rows.length }) },
              ]}
            />
            <HowCalculated className="mt-1">
              <p>{t("foodplan.howTargets")}</p>
              <p>{t("foodplan.howCoverage")}</p>
              <p>{t("metrics.howActual")}</p>
              <p>{t("foodplan.howVsCalories")}</p>
            </HowCalculated>
          </div>
        )}

          <section aria-labelledby="crop-plan" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="crop-plan" className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t("foodplan.cropPlan")}</h2>
                {grown.length > 0 && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("foodplan.cropPlanDesc")}</p>}
              </div>
              {grown.length > 0 && (
                <Legend
                  items={[
                    { label: t("metrics.actual"), color: "brand" },
                    { label: t("metrics.forecast"), color: "brand", swatch: "hatched" },
                    // The target tick is only drawn where a crop overshoots it.
                    ...(targetTickShown ? [{ label: t("foodplan.target"), color: "muted" as const, swatch: "line" as const }] : []),
                  ]}
                />
              )}
            </div>
            {grown.length > 0 && (
              // Rows come sorted by the largest gap (getCropPlan), so the top of the
              // list is "where it is missing most" — no separate card repeating it.
              <List label={t("foodplan.cropPlan")}>
                {grown.map((r) => {
                  const p = plantMap.get(r.plantId)!;
                  const covered = r.targetKg > 0 && Math.max(r.forecastKg, r.actualKg) >= r.targetKg;
                  const gap = r.deficitKg > 0.05;
                  // "Große Lücke" by a rule, not by rank: the forecast reaches less
                  // than a quarter of the target (two crops with the same figures
                  // always get the same badge).
                  // …and only on the three largest, so the badge still tells rows apart.
                  const bigGap = gap && r.targetKg > 0 && r.forecastKg < r.targetKg * BIG_GAP_SHARE && bigGapIds.has(r.plantId);
                  return (
                    <ListRow
                      key={r.plantId}
                      leading={<PlantIconDisplay plantId={p.id} emoji={p.icon} size={28} />}
                      title={plantName(p.id)}
                      badges={covered ? <Badge tone="positive">{t("foodplan.covered")}</Badge> : bigGap ? <Badge tone="neutral">{t("foodplan.bigGap")}</Badge> : undefined}
                      meta={[
                        t("foodplan.rowForecast", { forecast: kg(r.forecastKg) }),
                        gap ? t("foodplan.rowGap", { kg: kg(r.deficitKg), area: f.formatArea(r.extraAreaM2) }) : null,
                      ]}
                      trailing={
                        // Fixed width: every bar in the list ends at the same x.
                        <span className="block w-24 text-right">
                          {t("foodplan.rowOfTarget", { actual: f.formatNumber(r.actualKg, { maximumFractionDigits: 1 }), target: kg(r.targetKg) })}
                        </span>
                      }
                      description={
                        <span className="mt-1.5 flex items-center">
                          <Meter
                            className="min-w-0 flex-1"
                            size={6}
                            actual={r.actualKg}
                            forecast={r.forecastKg}
                            max={Math.max(r.targetKg, r.forecastKg, r.actualKg)}
                            target={r.targetKg}
                            label={t("foodplan.meterLabel", { plant: plantName(p.id), actual: kg(r.actualKg), forecast: kg(r.forecastKg), target: kg(r.targetKg) })}
                          />
                        </span>
                      }
                    />
                  );
                })}
              </List>
            )}
            {unplanted.length > 0 && (
              <details className="group rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{t(empty ? "foodplan.planCropsTitle" : "foodplan.unplantedTitle", { count: unplanted.length })}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {/* Without beds the area is already the hero's second figure: name the biggest gaps instead. */}
                      {empty
                        ? t("foodplan.biggestGaps", { plants: [...unplanted].sort((a, b) => b.targetKg - a.targetKg).slice(0, 3).map((r) => plantName(r.plantId)).join(", ") })
                        : t("foodplan.unplantedDesc", { area: f.formatArea(unplantedArea) })}
                    </span>
                  </span>
                  <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-gray-500 transition-transform group-open:rotate-180 dark:text-gray-400" />
                </summary>
                <ul className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-white/5 dark:border-white/5">
                  {unplanted.map((r) => {
                    const p = plantMap.get(r.plantId)!;
                    return (
                      <ListRow
                        key={r.plantId}
                        leading={<PlantIconDisplay plantId={p.id} emoji={p.icon} size={28} />}
                        title={plantName(p.id)}
                        meta={[t("foodplan.targetShort", { target: kg(r.targetKg) }), t("foodplan.neededShort", { area: f.formatArea(r.neededAreaM2) })]}
                      />
                    );
                  })}
                </ul>
                {!empty && (
                  <div className="border-t border-gray-100 px-4 py-3 dark:border-white/5">
                    <Button variant="secondary" size="sm" onClick={() => navigate("/planner")}>
                      <LayoutGrid size={16} aria-hidden="true" />
                      {t("plants.placeInPlanner")}
                    </Button>
                  </div>
                )}
              </details>
            )}
          </section>

          {animals.length > 0 && (
            <section aria-labelledby="animal-products" className="space-y-3">
              <div>
                <h2 id="animal-products" className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t("foodplan.animalProducts")}</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("foodplan.animalIntro", { count: householdSize })}</p>
              </div>
              <List label={t("foodplan.animalProducts")}>
                {/* A food plan lists food: wax and wool have no consumption figure and stay out. */}
                {PRODUCT_TYPES.filter((ty) => animalForecast[ty] > 0 && ANNUAL_CONSUMPTION_KG_PER_PERSON[ty] !== undefined).map((ty) => {
                  const perPerson = ANNUAL_CONSUMPTION_KG_PER_PERSON[ty];
                  // Typical household consumption in the recording unit (eggs as hen's eggs).
                  const need = perPerson === undefined ? null : (perPerson / (ty === "eggs" ? EGG_WEIGHT_KG : 1)) * householdSize;
                  const surplus = need === null ? 0 : Math.max(0, animalForecast[ty] - need);
                  return (
                    <ListRow
                      key={ty}
                      leading={<IconTile icon={PRODUCT_ICON[ty]} />}
                      title={t(`livestock.products.${ty}`)}
                      badges={need !== null && surplus > 0 ? <Badge tone="positive">{t("foodplan.surplusBadge")}</Badge> : undefined}
                      meta={need === null
                        ? t("sufficiency.nonFood")
                        : [t("foodplan.animalNeed", { amount: formatProductAmount(ty, need, f, t) }), surplus > 0 ? t("foodplan.animalSurplus", { amount: formatProductAmount(ty, surplus, f, t) }) : null]}
                      trailing={t("sufficiency.perYear", { amount: formatProductAmount(ty, animalForecast[ty], f, t) })}
                    />
                  );
                })}
              </List>
            </section>
          )}
      </div>
    </div>
  );
}
