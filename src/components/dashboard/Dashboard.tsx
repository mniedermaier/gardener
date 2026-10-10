import { useMemo, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Apple, ArrowRight, Plus, Star } from "lucide-react";
import { getISOWeek } from "date-fns";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { useHarvestReady } from "@/hooks/useHarvestReady";
import { useSowingAgenda } from "@/hooks/useSowingAgenda";
import { useVisibleAgendaRows } from "@/components/calendar/PlantableNowList";
import { useGardenMetrics } from "@/hooks/useGardenMetrics";
import type { OpenAddState } from "@/hooks/useOpenAddOnNavigate";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListRow } from "@/components/ui/List";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { HowCalculated, KeyFigures, Meter } from "@/components/ui/charts";
import { ANNUAL_YIELD } from "@/types/animal";
import { PlantingAdvisor } from "./PlantingAdvisor";
import { HarvestReady } from "./HarvestReady";
import { TodayTasks } from "./TodayTasks";
import { WeatherCard } from "./WeatherCard";
import { GardenMap } from "./GardenMap";
import { useWeatherGlance } from "@/hooks/useWeatherGlance";
import { useFrostSummary } from "@/components/weather/frost";
import { GettingStarted, useGettingStartedSteps } from "./GettingStarted";
import { BackupHint } from "./BackupHint";

type NowTab = "harvest" | "sow";


const WIDE = "(min-width: 1024px)";
const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
/** lg and up: weather sits in the side column; below it follows the tasks. */
const useWide = () => useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => true);

/**
 * "Heute": what to do today (checkable tasks), the weather, what to sow and
 * harvest now, and the season so far. New users get a first-steps checklist
 * instead of a wall of zeros.
 */
export function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatWeight, formatCurrency, formatNumber, formatPercent, formatDate, locale } = useFormat();
  // Self-sufficiency shares as on the analysis page: a decimal below 10 %, so
  // "2,5 % · Soll 3,5 %" does not round to "2 % · 4 %" here.
  const share = (r: number) => formatPercent(r, r < 0.1 ? 1 : 0);
  const { gardens, activeGardenId, harvests, expenses, animals } = useStore(
    useShallow((s) => ({ gardens: s.gardens, activeGardenId: s.activeGardenId, harvests: s.harvests, expenses: s.expenses, animals: s.animals })),
  );
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();

  // Fixed at mount: new Date() during render is impure and would invalidate
  // every memo that depends on it on each render.
  const [now] = useState(() => new Date());
  const steps = useGettingStartedSteps();
  const wide = useWide();
  const harvestReady = useHarvestReady(now);
  const sowing = useSowingAgenda();
  const visibleNow = useVisibleAgendaRows(sowing.now);
  // One weather fetch for the card and the map's frost pins.
  const glance = useWeatherGlance();
  const frost = useFrostSummary(glance.status === "ready" ? glance.data.days : undefined);
  const mapGarden = gardens.find((g) => g.id === activeGardenId) ?? gardens[0];
  const [nowTab, setNowTab] = useState<NowTab>(() => (harvestReady.length > 0 ? "harvest" : "sow"));

  const totalBeds = gardens.reduce((s, g) => s + g.beds.length, 0);
  const totalPlantings = gardens.reduce((s, g) => s + g.beds.reduce((sb, b) => sb + b.cells.length, 0), 0);
  const uniquePlantIds = new Set<string>();
  for (const g of gardens) for (const b of g.beds) for (const c of b.cells) uniquePlantIds.add(c.plantId);

  // Season figures come from lib/metrics.ts so they match the analysis pages.
  const m = useGardenMetrics();
  const harvestActual = m.harvest.actual.totalGrams;
  const harvestForecast = m.harvest.forecast.totalGrams;
  const totalAnimals = animals.reduce((s, a) => s + a.count, 0);
  const layers = animals.filter((a) => ANNUAL_YIELD[a.type]?.some((y) => y.product === "eggs")).reduce((s, a) => s + a.count, 0);

  const recentHarvests = useMemo(
    () => [...harvests].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4),
    [harvests],
  );

  const dateLine = t("dashboard.dateLine", {
    date: new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(now),
    week: getISOWeek(now),
  });
  const hasSeason = harvests.length > 0 || expenses.length > 0 || totalAnimals > 0 || totalPlantings > 0;
  const firstGarden = gardens.length === 1 ? gardens[0].name : null;

  const map = mapGarden && mapGarden.beds.length > 0
    ? <GardenMap garden={mapGarden} now={now} harvestReady={harvestReady} frost={frost?.summary ?? null} />
    : null;

  const addHarvest = () => navigate("/harvest", { state: { openAdd: true } satisfies OpenAddState });

  return (
    <div>
      <PageHeader
        title={t("dashboard.title")}
        description={firstGarden ? `${dateLine} · ${firstGarden}` : dateLine}
        actions={
          totalBeds > 0 && <span className="hidden sm:contents">
            <Button onClick={addHarvest}>
              <Plus size={16} aria-hidden="true" />
              {t("harvest.add")}
            </Button>
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="min-w-0 space-y-8 lg:col-span-2">
          <GettingStarted steps={steps} />

          {/* No beds yet: the season still has something to start now — one line to the calendar. */}
          {totalBeds === 0 && visibleNow.length > 0 && (
            <Link
              to="/calendar"
              className="flex min-h-11 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900 dark:hover:bg-white/5"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-gray-900 dark:text-gray-100">{t("dashboard.sowNowCount", { count: visibleNow.length })}</span>
                <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{visibleNow.slice(0, 4).map((r) => getPlantName(r.plantId)).join(", ")}</span>
              </span>
              <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-gray-400" />
            </Link>
          )}

          {wide && map}

          <TodayTasks now={now} hideWhenEmpty={!steps.find((s) => s.id === "tasks")?.done} />

          {!wide && map}

          {!wide && <WeatherCard glance={glance} />}

          {totalBeds > 0 && <section>
            <div className="mb-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">{t("dashboard.nowTitle")}</h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{t("dashboard.nowSubtitle")}</p>
            </div>
            <Card padding="none">
              <Tabs
                label={t("dashboard.nowTitle")}
                value={nowTab}
                onChange={setNowTab}
                className="[&>[role=tablist]]:px-2"
                items={[
                  { value: "harvest", label: t("dashboard.tabHarvest"), count: harvestReady.length },
                  { value: "sow", label: t("dashboard.tabSow"), count: visibleNow.length },
                ]}
              >
                <div className="-mt-4">
                  {nowTab === "harvest" ? <HarvestReady items={harvestReady} /> : <PlantingAdvisor />}
                </div>
              </Tabs>
            </Card>
          </section>}
        </div>

        <aside className="min-w-0 space-y-6" aria-label={t("dashboard.sideLabel")}>
          {wide && <WeatherCard glance={glance} />}

          {hasSeason && (
            <section>
              {/* Title inside the surface, like the weather card above. */}
              <KeyFigures
                title={t("dashboard.seasonTitle")}
                layout="stack"
                hero={{
                  label: t("metrics.yieldActual"),
                  value: formatWeight(harvestActual),
                  icon: Apple,
                  tone: "brand",
                  to: "/harvest",
                  visual: harvestForecast > 0 ? (
                    <Meter
                      actual={harvestActual}
                      forecast={harvestForecast}
                      max={Math.max(harvestActual, harvestForecast)}
                      label={t("metrics.actualVsForecast", { actual: formatWeight(harvestActual), forecast: formatWeight(harvestForecast) })}
                    />
                  ) : undefined,
                  hint: (
                    <span className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                      <span>{t("metrics.harvestEntries", { count: m.harvest.entryCount })}</span>
                      {harvestForecast > 0 && <span className="tabular-nums">{t("dashboard.forecastValue", { value: formatWeight(harvestForecast) })}</span>}
                    </span>
                  ),
                }}
                items={[
                  {
                    label: t("metrics.selfSufficiencyForecast"),
                    value: share(m.selfSufficiency.forecastRatio),
                    // One short hint here; "erwartet bis heute" and its reasoning live under "Wie berechnet?".
                    hint: t("metrics.actualShort", { value: share(m.selfSufficiency.actualRatio) }),
                    to: "/sufficiency",
                  },
                  {
                    label: t("expenses.net"),
                    value: formatCurrency(m.balance.net),
                    hint: m.balance.roi === null ? t("expenses.roiNoCosts") : t("dashboard.roiValue", { value: formatPercent(m.balance.roi) }),
                    to: "/expenses",
                  },
                  layers > 0
                    ? { label: t("dashboard.totalEggs"), value: formatNumber(m.animalProducts.actual.eggs, { maximumFractionDigits: 0 }), hint: t("dashboard.animalsCount", { count: layers }), to: "/livestock" }
                    : { label: t("dashboard.plantings"), value: formatNumber(totalPlantings), hint: t("dashboard.typesInBeds", { types: formatNumber(uniquePlantIds.size), count: totalBeds }), to: "/planner" },
                ]}
              />
              {m.selfSufficiency.forecastToDateRatio !== null && (
                <HowCalculated className="mt-2">
                  <p>{t("metrics.expectedToDate", { value: share(m.selfSufficiency.forecastToDateRatio) })}</p>
                  <p>{t("metrics.howToDate")}</p>
                </HowCalculated>
              )}
            </section>
          )}

          {recentHarvests.length > 0 && (
            <Card padding="none">
              <CardHeader
                className="mb-0 px-4 pt-4 pb-2"
                title={t("dashboard.recentHarvests")}
                actions={
                  <Link to="/harvest" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-garden-700 hover:underline sm:min-h-0 dark:text-garden-300">
                    {t("dashboard.viewAll")} <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                }
              />
              <ul className="divide-y divide-gray-100 dark:divide-white/5" aria-label={t("dashboard.recentHarvests")}>
                {recentHarvests.map((h) => {
                  const plant = plantMap.get(h.plantId);
                  return (
                    <ListRow
                      key={h.id}
                      leading={plant ? <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={24} /> : undefined}
                      title={getPlantName(h.plantId)}
                      meta={[
                        // One date format per list ("relative" turns into a short date after a week).
                        <time key="d" dateTime={h.date}>{formatDate(h.date, "short")}</time>,
                        (h.quality ?? 0) > 0 && (
                          <span key="q" className="inline-flex items-center gap-0.5 align-top" aria-label={t("dashboard.quality", { count: h.quality })}>
                            <Star size={11} aria-hidden="true" className="fill-current text-amber-500 dark:text-amber-400" />{h.quality}
                          </span>
                        ),
                      ]}
                      trailing={h.weightGrams ? formatWeight(h.weightGrams) : undefined}
                    />
                  );
                })}
              </ul>
            </Card>
          )}

          <BackupHint now={now} />
        </aside>
      </div>
    </div>
  );
}
