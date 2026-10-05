import { useMemo, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Apple, ArrowRight, Sprout, Wallet, Egg, Plus, Star } from "lucide-react";
import { getISOWeek } from "date-fns";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { useHarvestReady } from "@/hooks/useHarvestReady";
import type { OpenAddState } from "@/hooks/useOpenAddOnNavigate";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { List, ListRow } from "@/components/ui/List";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { PlantingAdvisor } from "./PlantingAdvisor";
import { HarvestReady } from "./HarvestReady";
import { TodayTasks } from "./TodayTasks";
import { WeatherCard } from "./WeatherCard";
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
  const { formatWeight, formatCurrency, formatNumber, formatDate, locale } = useFormat();
  const { gardens, harvests, expenses, animals, animalProducts } = useStore(
    useShallow((s) => ({ gardens: s.gardens, harvests: s.harvests, expenses: s.expenses, animals: s.animals, animalProducts: s.animalProducts })),
  );
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();

  // Fixed at mount: new Date() during render is impure and would invalidate
  // every memo that depends on it on each render.
  const [now] = useState(() => new Date());
  const steps = useGettingStartedSteps();
  const wide = useWide();
  const harvestReady = useHarvestReady(now);
  const [nowTab, setNowTab] = useState<NowTab>(() => (harvestReady.length > 0 ? "harvest" : "sow"));

  const totalBeds = gardens.reduce((s, g) => s + g.beds.length, 0);
  const totalPlantings = gardens.reduce((s, g) => s + g.beds.reduce((sb, b) => sb + b.cells.length, 0), 0);
  const uniquePlantIds = new Set<string>();
  for (const g of gardens) for (const b of g.beds) for (const c of b.cells) uniquePlantIds.add(c.plantId);

  const totalHarvestGrams = harvests.reduce((s, h) => s + (h.weightGrams ?? 0), 0);
  const totalExpenseEur = expenses.reduce((s, e) => s + e.amountCents, 0) / 100;
  const totalAnimals = animals.reduce((s, a) => s + a.count, 0);
  const totalEggs = animalProducts.filter((p) => p.type === "eggs").reduce((s, p) => s + p.quantity, 0);

  const recentHarvests = useMemo(
    () => [...harvests].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4),
    [harvests],
  );

  const dateLine = t("dashboard.dateLine", {
    date: new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(now),
    week: getISOWeek(now),
  });
  const hasSeason = harvests.length > 0 || expenses.length > 0 || totalAnimals > 0;
  const firstGarden = gardens.length === 1 ? gardens[0].name : null;

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
              {t("quickAdd.harvest")}
            </Button>
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="min-w-0 space-y-8 lg:col-span-2">
          <GettingStarted steps={steps} />

          <TodayTasks now={now} hideWhenEmpty={!steps.find((s) => s.id === "tasks")?.done} />

          {!wide && <WeatherCard />}

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
                  { value: "sow", label: t("dashboard.tabSow") },
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
          {wide && <WeatherCard />}

          {hasSeason && (
            <section>
              <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">{t("dashboard.seasonTitle")}</h2>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/harvest" className="rounded-xl">
                  <StatCard
                    label={t("dashboard.harvested")}
                    value={formatWeight(totalHarvestGrams)}
                    icon={Apple}
                    hint={t("dashboard.harvestEntries", { count: harvests.length })}
                    className="h-full transition-colors hover:border-gray-300 dark:hover:border-white/20"
                  />
                </Link>
                <Link to="/planner" className="rounded-xl">
                  <StatCard
                    label={t("dashboard.plantings")}
                    value={formatNumber(totalPlantings)}
                    icon={Sprout}
                    hint={t("dashboard.typesInBeds", { types: formatNumber(uniquePlantIds.size), count: totalBeds })}
                    className="h-full transition-colors hover:border-gray-300 dark:hover:border-white/20"
                  />
                </Link>
                <Link to="/expenses" className="rounded-xl">
                  <StatCard
                    label={t("dashboard.totalExpenses")}
                    value={formatCurrency(totalExpenseEur, { maximumFractionDigits: 0 })}
                    icon={Wallet}
                    tone="neutral"
                    className="h-full transition-colors hover:border-gray-300 dark:hover:border-white/20"
                  />
                </Link>
                {totalAnimals > 0 && (
                  <Link to="/livestock" className="rounded-xl">
                    <StatCard
                      label={t("dashboard.totalEggs")}
                      value={formatNumber(totalEggs)}
                      icon={Egg}
                      tone="neutral"
                      hint={t("dashboard.animalsCount", { count: totalAnimals })}
                      className="h-full transition-colors hover:border-gray-300 dark:hover:border-white/20"
                    />
                  </Link>
                )}
              </div>
            </section>
          )}

          {recentHarvests.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t("dashboard.recentHarvests")}</h2>
                <Link to="/harvest" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-garden-700 hover:underline sm:min-h-0 dark:text-garden-300">
                  {t("dashboard.viewAll")} <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
              <List label={t("dashboard.recentHarvests")}>
                {recentHarvests.map((h) => {
                  const plant = plantMap.get(h.plantId);
                  return (
                    <ListRow
                      key={h.id}
                      leading={plant ? <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={24} /> : undefined}
                      title={getPlantName(h.plantId)}
                      meta={
                        <span className="inline-flex items-center gap-1.5">
                          <time dateTime={h.date}>{formatDate(h.date, "relative")}</time>
                          {h.quality > 0 && (
                            <span className="inline-flex items-center gap-0.5" aria-label={t("dashboard.quality", { count: h.quality })}>
                              · <Star size={11} aria-hidden="true" className="fill-current text-gray-400" />{h.quality}
                            </span>
                          )}
                        </span>
                      }
                      trailing={h.weightGrams ? formatWeight(h.weightGrams) : undefined}
                    />
                  );
                })}
              </List>
            </section>
          )}

          <BackupHint now={now} />
        </aside>
      </div>
    </div>
  );
}
