import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Apple, Beef, Citrus, Lightbulb, Sprout, Target, Wheat, Archive, Plus } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { useAnalysisPrefs } from "@/store/analysisPrefs";
import { usePlantMap, usePlants } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { useGardenMetrics } from "@/hooks/useGardenMetrics";
import { calculateSufficiency, loggedKgByMonth, LOW_COVERAGE_PERCENT, STORAGE_MONTHS } from "@/lib/sufficiency";
import { annualCalorieNeed, capToConsumption, DAILY_KCAL_PER_PERSON, EGG_WEIGHT_KG, getForecastProductKg, getForecastProducts, PRODUCT_TYPES, type ProductKg } from "@/lib/metrics";
import type { ProductType } from "@/types/animal";
import { PRODUCT_NUTRITION } from "@/types/animal";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { List, ListRow } from "@/components/ui/List";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { BarChart, HowCalculated, KeyFigures, Meter, MonthStrip } from "@/components/ui/charts";
import { PRODUCT_ICON } from "@/components/livestock/icons";
import { IconTile, formatProductAmount } from "@/components/livestock/shared";
import { HouseholdSizeField } from "./HouseholdSizeField";
import { PreservationGuide } from "./PreservationGuide";
import { useToday } from "@/hooks/useToday";
import { useAddBed } from "@/hooks/useAddBed";
import { roundShares } from "@/lib/format";

type View = "overview" | "crops" | "animals" | "preserve";
const NUTRIENTS = ["calories", "protein", "vitaminC", "fiber"] as const;
const NUTRIENT_ICON = { calories: Apple, protein: Beef, vitaminC: Citrus, fiber: Wheat };
/** Calorie-dense staples considered as levers ("+5 m² → +x %"). */
// One entry per kind: pumpkin stands for all squashes (Butternut would repeat it).
const LEVER_CROPS = ["potato", "bean", "corn", "pumpkin", "pea"];
const LEVER_AREA_M2 = 5;

export function SufficiencyDashboard() {
  const now = useToday();
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();
  const addBed = useAddBed();
  const { gardens, gridCellSizeCm, lastFrostDate, animals, pantryItems, harvests } = useStore(
    useShallow((s) => ({ gardens: s.gardens, gridCellSizeCm: s.gridCellSizeCm, lastFrostDate: s.lastFrostDate, animals: s.animals, pantryItems: s.pantryItems, harvests: s.harvests })),
  );
  const householdSize = useAnalysisPrefs((s) => s.householdSize);
  const plants = usePlants();
  const plantMap = usePlantMap();
  const plantName = usePlantName();
  const metrics = useGardenMetrics();
  const [view, setView] = useState<View>("overview");

  // Forecast basis: herd estimates, not extrapolated logs — same as metrics.ts.
  const result = useMemo(() => {
    const hasPlantings = gardens.some((g) => g.beds.some((b) => b.cells.length > 0));
    if (!hasPlantings && animals.length === 0) return null;
    // The real pantry stock fills the "aus dem Vorrat" series (see lib/sufficiency).
    return calculateSufficiency(gardens, plants, householdSize, gridCellSizeCm, lastFrostDate, animals, pantryItems, now);
  }, [gardens, plants, householdSize, gridCellSizeCm, lastFrostDate, animals, pantryItems, now]);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(2026, i, 1)), []);
  const monthShort = months.map((d) => f.formatDate(d, "month"));
  const monthLong = months.map((d) => new Intl.DateTimeFormat(f.locale, { month: "long" }).format(d));
  const currentMonth = now.getMonth();
  const year = now.getFullYear();
  const ss = metrics.selfSufficiency;

  const levers = useMemo(() => {
    const need = annualCalorieNeed(householdSize);
    return LEVER_CROPS.map((id) => plantMap.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p && !!p.expectedYieldKgPerM2 && !!p.caloriesPer100g)
      .map((p) => ({ plantId: p.id, gain: (LEVER_AREA_M2 * p.expectedYieldKgPerM2! * 10 * p.caloriesPer100g!) / need }))
      .sort((a, b) => b.gain - a.gain)
      .slice(0, 3);
  }, [plantMap, householdSize]);

  const viewOptions: { value: View; label: string; count?: number }[] = [
    { value: "overview", label: t("sufficiency.tabs.overview") },
    { value: "crops", label: t("sufficiency.tabs.crops"), count: result?.plantYields.length },
    { value: "animals", label: t("sufficiency.tabs.animals"), count: animals.length },
    { value: "preserve", label: t("sufficiency.tabs.preserve") },
  ];

  const header = (
    <PageHeader
      title={t("sufficiency.title")}
      description={t("sufficiency.subtitle")}
      actions={<HouseholdSizeField />}
      tabs={result ? <Tabs items={viewOptions} value={view} onChange={setView} label={t("sufficiency.views")} /> : undefined}
    />
  );

  if (!result) {
    return (
      <div>
        {header}
        <Card>
          <EmptyState
            icon={Target}
            title={t("sufficiency.emptyTitle")}
            description={t("sufficiency.emptyText", { count: householdSize, kcal: f.formatNumber(DAILY_KCAL_PER_PERSON * householdSize, { maximumFractionDigits: 0 }) })}
            // Same first step as every page without beds: "Beet hinzufügen" opens the planner's dialog.
            action={<Button onClick={addBed}><Plus size={16} aria-hidden="true" />{t("planner.addBed")}</Button>}
            secondaryAction={<Button variant="ghost" onClick={() => navigate("/livestock", { state: { openAdd: true } })}>{t("livestock.addAnimal")}</Button>}
          />
        </Card>
      </div>
    );
  }

  const lowCount = result.lowMonths.length;
  const gap = result.winterGap;
  const hasStored = result.monthlyFood.some((m) => m.storedKg > 0);
  const hasForecast = result.monthlyFood.some((m) => m.month > currentMonth && m.freshKg > 0);
  const hasAnimals = result.monthlyFood.some((m) => m.animalKg > 0);
  // Small shares get a decimal, so "erwartet bis heute" late in the year does not
  // read as the same 4 % as the annual forecast.
  const pct = (r: number) => f.formatPercent(r, r < 0.1 ? 1 : 0);
  // Past and running months: what was logged; later months: the forecast.
  const logged = loggedKgByMonth(harvests, now.getFullYear());
  const coverage = result.monthlyFood.map((m) => m.calories / Math.max(1, m.caloriesNeeded));

  return (
    <div>
      {header}

      {view === "overview" && (
        <div className="space-y-6">
          {/* The disclosure explains the figures: attached below them, not a section of its own. */}
          <div>
            <KeyFigures
              hero={{
                label: t("metrics.selfSufficiencyForecast"),
                value: pct(ss.forecastRatio),
                icon: Target,
                tone: "brand",
                hint: t("metrics.caloriesFor", { count: householdSize }),
              }}
              items={[
                {
                  label: t("metrics.selfSufficiencyActual"),
                  value: pct(ss.actualRatio),
                  hint: ss.forecastToDateRatio !== null ? t("metrics.expectedToDate", { value: pct(ss.forecastToDateRatio) }) : t("metrics.recordedSince", { year }),
                },
                { label: t("metrics.yieldForecast"), value: f.formatWeight(metrics.harvest.forecast.totalGrams), hint: t("metrics.plantsOnly") },
                { label: t("metrics.yieldActual"), value: f.formatWeight(metrics.harvest.actual.totalGrams), hint: t("metrics.harvestEntries", { count: metrics.harvest.entryCount }), to: "/harvest" },
              ]}
            />
            <HowCalculated className="mt-1">
              <p>{t("metrics.howNeed", { kcal: f.formatNumber(DAILY_KCAL_PER_PERSON, { maximumFractionDigits: 0 }) })}</p>
              <p>{t("metrics.howForecast")}</p>
              <p>{t("metrics.howCap")}</p>
              <p>{t("metrics.howActual")}</p>
              <p>{t("metrics.howToDate")}</p>
              <p>{t("metrics.howVsFoodPlan")}</p>
            </HowCalculated>
          </div>

          <Composition />

          <Card>
            <CardHeader title={t("sufficiency.monthlyTitle")} description={t(hasStored ? "sufficiency.monthlyDesc" : "sufficiency.monthlyDescFresh", { count: householdSize })} />
            <MonthStrip
              values={coverage}
              monthLabels={monthShort}
              monthNames={monthLong}
              formatValue={(r) => f.formatPercent(Math.min(1, r))}
              current={currentMonth}
              currentLabel={t("charts.today")}
              threshold={LOW_COVERAGE_PERCENT / 100}
              caption={t("sufficiency.monthlyCaption")}
            />
            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-white/5 dark:text-gray-300">
              {lowCount >= 11 ? (
                <p>{t("sufficiency.noMonthCovered", { percent: f.formatPercent(LOW_COVERAGE_PERCENT / 100) })}</p>
              ) : gap ? (
                <p>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{t("sufficiency.winterGap")}: </span>
                  {t("sufficiency.winterGapDesc", {
                    months: gap.months.map((m) => monthLong[m]).join(", "),
                    kg: f.formatWeight(gap.storedKgNeeded * 1000),
                    percent: f.formatPercent(LOW_COVERAGE_PERCENT / 100),
                  })}
                </p>
              ) : (
                <p>{t("sufficiency.noWinterGap", { from: monthLong[STORAGE_MONTHS[0]], to: monthLong[STORAGE_MONTHS[STORAGE_MONTHS.length - 1]] })}</p>
              )}
            </div>
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{t("sufficiency.monthlyKgTitle")}</h3>
              <BarChart
                // Garden: logged harvest up to this month (solid), forecast after it
                // (hatched) — past months match the harvest log. Stored food and
                // animal products are their own parts.
                data={result.monthlyFood.map((m) => ({
                  key: String(m.month), label: monthShort[m.month], fullLabel: monthLong[m.month],
                  values: [
                    m.month <= currentMonth ? logged[m.month] : 0,
                    ...(hasForecast ? [m.month > currentMonth ? m.freshKg : 0] : []),
                    ...(hasStored ? [m.storedKg] : []),
                    ...(hasAnimals ? [m.animalKg] : []),
                  ],
                }))}
                series={[
                  { label: t("sufficiency.harvested"), color: "brand" },
                  // Legend only for a series that is actually drawn.
                  ...(hasForecast ? [{ label: t("sufficiency.freshForecast"), color: "brand" as const, hatched: true }] : []),
                  ...(hasStored ? [{ label: t("sufficiency.stored"), color: "sky" as const }] : []),
                  ...(hasAnimals ? [{ label: t("metrics.fromAnimals"), color: "earth" as const, muted: true }] : []),
                ]}
                formatValue={(v) => f.formatWeight(v * 1000)}
                formatTick={(v) => (v === 0 ? "0" : f.formatWeight(v * 1000))}
                marker={{ index: currentMonth, label: t("charts.today") }}
                caption={t("sufficiency.monthlyKgCaptionSplit", { month: monthLong[currentMonth] })}
                categoryLabel={t("charts.month")}
              />
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title={t("sufficiency.nutritionCoverage")} description={t("sufficiency.coverageDesc", { count: householdSize })} />
              <ul className="space-y-4">
                {NUTRIENTS.map((key) => {
                  const data = result.nutrition[key];
                  const Icon = NUTRIENT_ICON[key];
                  const unit = key === "calories" ? "kcal" : key === "vitaminC" ? "mg" : "g";
                  const label = t(`sufficiency.nutrients.${key}`);
                  return (
                    <li key={key}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                          <Icon size={14} aria-hidden="true" className="text-gray-500" />
                          {label}
                        </span>
                        <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{f.formatPercent(data.percent / 100, data.percent < 10 ? 1 : 0)}</span>
                      </div>
                      <Meter forecast={data.produced} max={data.needed} label={`${label}: ${f.formatPercent(data.percent / 100, data.percent < 10 ? 1 : 0)}`} />
                      <p className="mt-1 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                        {t("sufficiency.ofNeed", { produced: `${f.formatNumber(data.produced, { maximumFractionDigits: 0 })} ${unit}`, needed: `${f.formatNumber(data.needed, { maximumFractionDigits: 0 })} ${unit}` })}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card>
              <CardHeader title={t("sufficiency.leversTitle")} description={t("sufficiency.leversDesc", { area: f.formatArea(LEVER_AREA_M2) })} />
              <ul className="divide-y divide-gray-100 dark:divide-white/5">
                {levers.map((l) => {
                  const p = plantMap.get(l.plantId)!;
                  return (
                    <li key={l.plantId} className="flex items-center gap-3 py-2.5">
                      <PlantIconDisplay plantId={p.id} emoji={p.icon} size={28} />
                      <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{t("sufficiency.leverRow", { area: f.formatArea(LEVER_AREA_M2), plant: plantName(p.id) })}</span>
                      <Badge tone="brand" icon={Lightbulb}>{t("sufficiency.leverGain", { percent: f.formatPercent(l.gain, 1) })}</Badge>
                    </li>
                  );
                })}
              </ul>
              {result.gaps.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-3 dark:border-white/5">
                  <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">{t("sufficiency.gaps")}</p>
                  <ul className="space-y-1.5 text-sm">
                    {result.gaps.map((g) => (
                      <li key={g.nutrient} className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{t(`sufficiency.nutrients.${g.nutrient}`)} · {f.formatPercent(g.percent / 100, g.percent < 10 ? 1 : 0)}</span>
                        {" – "}
                        {g.suggestion.split(",").filter((id) => plantMap.has(id)).map((id) => plantName(id)).join(", ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {view === "crops" && (
        result.plantYields.length === 0 ? (
          <Card><EmptyState compact icon={Sprout} title={t("sufficiency.noCropsTitle")} description={t("sufficiency.noCrops")} action={<Button onClick={() => navigate("/planner")}>{t("sufficiency.toPlanner")}</Button>} /></Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("sufficiency.cropsIntro")}</p>
            <List label={t("sufficiency.yieldByPlant")}>
              {[...result.plantYields].sort((a, b) => b.estimatedKg - a.estimatedKg).map((y) => {
                const p = plantMap.get(y.plantId);
                if (!p) return null;
                const actualG = metrics.harvest.actual.byPlant[y.plantId] ?? 0;
                const forecastG = metrics.harvest.forecast.byPlant[y.plantId] ?? y.estimatedKg * 1000;
                return (
                  <ListRow
                    key={y.plantId}
                    leading={<PlantIconDisplay plantId={p.id} emoji={p.icon} size={28} />}
                    title={plantName(p.id)}
                    meta={[f.formatArea(y.areaM2), t("sufficiency.kcalValue", { kcal: f.formatNumber(y.calories, { maximumFractionDigits: 0 }) }), t("metrics.actualShort", { value: f.formatWeight(actualG) })]}
                    description={<Meter actual={actualG} forecast={forecastG} max={Math.max(actualG, forecastG, 1)} label={t("metrics.actualVsForecast", { actual: f.formatWeight(actualG), forecast: f.formatWeight(forecastG) })} className="mt-1.5 max-w-xs" size={6} />}
                    trailing={<span title={t("metrics.forecast")}>{f.formatWeight(forecastG)}</span>}
                  />
                );
              })}
            </List>
            <LegendNote />
          </div>
        )
      )}

      {view === "animals" && (
        animals.length === 0 ? (
          <Card><EmptyState compact icon={Beef} title={t("sufficiency.noAnimalsTitle")} description={t("sufficiency.noAnimals")} action={<Button onClick={() => navigate("/livestock")}>{t("sufficiency.toLivestock")}</Button>} /></Card>
        ) : (
          <AnimalYields />
        )
      )}

      {view === "preserve" && (
        <div className="space-y-6">
          {result.storageRequirements.length > 0 && (
            <Card padding="none">
              <div className="p-4 pb-2 sm:px-6 sm:pt-5">
                <CardHeader className="mb-0" title={t("sufficiency.storageTitle")} description={t("sufficiency.storageDesc")} />
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-white/5">
                {result.storageRequirements.map((s) => {
                  const p = plantMap.get(s.plantId);
                  return (
                    <li key={s.plantId} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                      {p ? <PlantIconDisplay plantId={p.id} emoji={p.icon} size={28} /> : <IconTile icon={Archive} />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{plantName(s.plantId)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t(`preservation.methods.${s.method}`)} · {t("sufficiency.shelfLife", { count: s.shelfLifeMonths })}
                        </p>
                      </div>
                      <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100">{f.formatWeight(s.quantityKg * 1000)}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
          <PreservationGuide />
        </div>
      )}
    </div>
  );
}

function LegendNote() {
  const { t } = useTranslation();
  return <p className="text-xs text-gray-500 dark:text-gray-400">{t("metrics.meterLegend")}</p>;
}

/** Edible kg → amount in the product's recording unit (eggs as hen's eggs). */
const kgToUnits = (type: ProductType, kg: number) => (type === "eggs" ? kg / EGG_WEIGHT_KG : kg);

function surplusItems(surplus: ProductKg, f: ReturnType<typeof useFormat>, t: ReturnType<typeof useTranslation>["t"]): string[] {
  return PRODUCT_TYPES.filter((ty) => surplus[ty] > 0.05).map((ty) => (ty === "eggs" ? formatProductAmount(ty, kgToUnits(ty, surplus[ty]), f, t) : `${formatProductAmount(ty, surplus[ty], f, t)} ${t(`livestock.products.${ty}`)}`));
}

/** Where the calorie forecast comes from: garden vs. animal products, plus the uncounted surplus. */
function Composition() {
  const { t } = useTranslation();
  const f = useFormat();
  const { selfSufficiency: ss } = useGardenMetrics();
  if (ss.forecastKcal <= 0) return null;
  // Same precision as the hero (a decimal below 10 %), and parts rounded so
  // they add up to it: "Garten + Tierprodukte" must equal the forecast above.
  const digits = ss.forecastKcal / ss.needKcal < 0.1 ? 1 : 0;
  const [garden, animals] = roundShares([ss.forecastPlantKcal / ss.needKcal, ss.forecastAnimalKcal / ss.needKcal], digits);
  // On the scale of the whole year's need (100 %), so 4 % looks like 4 % – not like a full bar.
  const scale = Math.max(garden + animals, 1);
  const open = Math.max(0, 1 - garden - animals);
  const surplus = surplusItems(ss.forecastSurplusKg, f, t);
  return (
    <Card>
      <CardHeader title={t("metrics.compositionTitle")} description={t("metrics.compositionDesc")} />
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/20" role="img" aria-label={t("metrics.compositionLabel", { garden: f.formatPercent(garden, digits), animals: f.formatPercent(animals, digits) })}>
        {/* min-w: a share under 1 % still shows as a sliver next to its legend swatch. */}
        {garden > 0 && <span className="h-full min-w-2 border-r-2 border-white bg-garden-600 dark:border-gray-900 dark:bg-garden-400" style={{ width: `${(garden / scale) * 100}%` }} />}
        {animals > 0 && <span className="h-full min-w-2 bg-earth-400 dark:bg-earth-300" style={{ width: `${(animals / scale) * 100}%` }} />}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><span aria-hidden="true" className="size-2.5 rounded-sm bg-garden-600 dark:bg-garden-400" />{t("metrics.fromGarden")}</dt>
          <dd className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{f.formatPercent(garden, digits)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><span aria-hidden="true" className="size-2.5 rounded-sm bg-earth-400 dark:bg-earth-300" />{t("metrics.fromAnimals")}</dt>
          <dd className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{f.formatPercent(animals, digits)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><span aria-hidden="true" className="size-2.5 rounded-sm bg-gray-200 ring-1 ring-gray-300 ring-inset dark:bg-white/20 dark:ring-white/25" />{t("metrics.notCovered")}</dt>
          <dd className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{f.formatPercent(open, digits)}</dd>
        </div>
      </dl>
      {surplus.length > 0 && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{t("metrics.surplusNote", { items: surplus.join(", ") })}</p>}
    </Card>
  );
}

/** Herd products: forecast from typical yields, recorded from the production log. */
function AnimalYields() {
  const { t } = useTranslation();
  const f = useFormat();
  const metrics = useGardenMetrics();
  const animals = useStore((s) => s.animals);
  const householdSize = useAnalysisPrefs((s) => s.householdSize);
  const forecast = useMemo(() => getForecastProducts(animals), [animals]);
  const capped = useMemo(() => capToConsumption(getForecastProductKg(animals), householdSize), [animals, householdSize]);
  const types = PRODUCT_TYPES.filter((ty) => forecast[ty] > 0 || metrics.animalProducts.actual[ty] > 0);
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">{t("sufficiency.animalsIntro")}</p>
      <List label={t("sufficiency.animalYields")}>
        {types.map((ty) => {
          const kcal = capped.counted[ty] * 10 * PRODUCT_NUTRITION[ty].caloriesPer100g;
          const surplus = capped.surplus[ty];
          const actual = metrics.animalProducts.actual[ty];
          return (
            <ListRow
              key={ty}
              leading={<IconTile icon={PRODUCT_ICON[ty]} />}
              title={t(`livestock.products.${ty}`)}
              meta={[
                t("metrics.actualShort", { value: formatProductAmount(ty, actual, f, t) }),
                kcal > 0 ? t("sufficiency.kcalCounted", { kcal: f.formatNumber(kcal, { maximumFractionDigits: 0 }) }) : t("sufficiency.nonFood"),
                surplus > 0.05 ? t("sufficiency.surplus", { amount: formatProductAmount(ty, kgToUnits(ty, surplus), f, t) }) : null,
              ]}
              description={<Meter actual={actual} forecast={forecast[ty]} max={Math.max(actual, forecast[ty], 1)} size={6} className="mt-1.5 max-w-xs" label={t("metrics.actualVsForecast", { actual: formatProductAmount(ty, actual, f, t), forecast: formatProductAmount(ty, forecast[ty], f, t) })} />}
              trailing={t("sufficiency.perYear", { amount: formatProductAmount(ty, forecast[ty], f, t) })}
            />
          );
        })}
      </List>
      <LegendNote />
      <p className="text-xs text-gray-500 dark:text-gray-400">{t("metrics.howCap")}</p>
    </div>
  );
}
