import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { differenceInCalendarDays, endOfYear, startOfYear } from "date-fns";
import {
  ArrowLeft, Check, X, Ruler, CalendarClock, Scale, Sun, LayoutGrid, Package, Apple, Pencil, Network, Leaf,
} from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { intlLocale } from "@/lib/format";
import { getPhaseWindows, seasonFrost, type PhaseWindow } from "@/lib/season";
import { PHASE_META, PhaseSwatch, phaseFill } from "@/components/ui/phase";
import type { Plant } from "@/types/plant";
import type { EnvironmentType } from "@/types/garden";
import type { OpenAddState } from "@/hooks/useOpenAddOnNavigate";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { List, ListRow } from "@/components/ui/List";
import { EmptyState } from "@/components/ui/EmptyState";
import { EnvironmentChip } from "@/components/planner/environment";

interface PlantDetailProps {
  plant: Plant;
  onBack: () => void;
  /** Opens another plant (partner chips). */
  onSelectPlant: (id: string) => void;
  /** Only for custom plants. */
  onEdit?: () => void;
}

type Phase = PhaseWindow & { key: PhaseWindow["phase"] };

/** Season windows for the user's own last-frost date (shared with the calendar). */
function buildPhases(plant: Plant, frost: Date): Phase[] {
  return getPhaseWindows(plant, frost).map((w) => ({ ...w, key: w.phase }));
}

function PhaseIcon({ phase }: { phase: Phase["key"] }) {
  const Icon = PHASE_META[phase].icon;
  return <Icon size={14} aria-hidden="true" className={`shrink-0 ${PHASE_META[phase].text}`} />;
}

/** 12-month strip with one labelled row per phase and a today marker. */
const SeasonStrip = memo(function SeasonStrip({ phases, frost }: { phases: Phase[]; frost: Date }) {
  const { t } = useTranslation();
  const { formatDate, locale } = useFormat();
  const yearStart = startOfYear(frost);
  const yearEnd = endOfYear(frost);
  const total = differenceInCalendarDays(yearEnd, yearStart) + 1;
  const pos = (d: Date) => Math.min(100, Math.max(0, (differenceInCalendarDays(d, yearStart) / total) * 100));

  const months = (() => {
    const shortFmt = new Intl.DateTimeFormat(intlLocale(locale), { month: "short" });
    const narrowFmt = new Intl.DateTimeFormat(intlLocale(locale), { month: "narrow" });
    return Array.from({ length: 12 }, (_, m) => {
      const d = new Date(yearStart.getFullYear(), m, 1);
      return { left: pos(d), short: shortFmt.format(d).replace(".", ""), narrow: narrowFmt.format(d) };
    });
  })();

  const now = new Date();
  const today = new Date(yearStart.getFullYear(), now.getMonth(), now.getDate());
  const todayLeft = pos(today);
  const frostLeft = pos(frost);

  const grid = (
    <>
      {months.slice(1).map((m) => (
        <span key={m.left} className="absolute inset-y-0 w-px bg-gray-200 dark:bg-white/10" style={{ left: `${m.left}%` }} aria-hidden="true" />
      ))}
      <span className="absolute inset-y-0 border-l border-dashed border-gray-500" style={{ left: `${frostLeft}%` }} aria-hidden="true" />
      <span className="absolute inset-y-0 z-10 w-0.5 bg-garden-700 dark:bg-garden-300" style={{ left: `${todayLeft}%` }} aria-hidden="true" />
    </>
  );

  return (
    <div>
      {/* Today flag above the month axis */}
      <div className="flex gap-3">
        <div className="hidden w-28 shrink-0 sm:block" />
        <div className="relative mb-1 h-5 flex-1" aria-hidden="true">
          <span
            className="absolute top-0 -translate-x-1/2 rounded bg-garden-700 px-1.5 text-xs font-medium leading-5 whitespace-nowrap text-white dark:bg-garden-300 dark:text-gray-950"
            style={{ left: `${Math.min(94, Math.max(6, todayLeft))}%` }}
          >
            {t("plants.detail.today")}
          </span>
        </div>
      </div>
      {/* Month axis */}
      <div className="flex gap-3">
        <div className="hidden w-28 shrink-0 sm:block" />
        <div className="relative h-5 flex-1 text-xs text-gray-500 dark:text-gray-400" aria-hidden="true">
          {months.map((m, i) => (
            <span
              key={m.left}
              className="absolute top-0 text-center"
              style={{ left: `${m.left}%`, width: `${(months[i + 1]?.left ?? 100) - m.left}%` }}
            >
              <span className="sm:hidden">{m.narrow}</span>
              <span className="hidden sm:inline">{m.short}</span>
            </span>
          ))}
        </div>
      </div>

      <ul className="mt-1 space-y-2">
        {phases.map((p) => {
          const left = pos(p.start);
          const width = Math.max(1.5, pos(p.end) - left);
          const range = t("plants.detail.window", { from: formatDate(p.start), to: formatDate(p.end) });
          const label = t(`plants.details.${p.key}`);
          return (
            <li key={p.key} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span className="flex items-baseline justify-between gap-2 text-sm sm:block sm:w-28 sm:shrink-0">
                <span className="inline-flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200">
                  <PhaseIcon phase={p.key} />
                  {label}
                </span>
                <span className="text-xs text-gray-500 sm:hidden dark:text-gray-400">{range}</span>
              </span>
              <span className="relative block h-7 w-full shrink-0 overflow-hidden rounded-md bg-gray-50 sm:w-auto sm:flex-1 dark:bg-white/5">
                {grid}
                <span
                  className={`absolute inset-y-1 rounded ${phaseFill(p.key).className}`}
                  style={{ ...phaseFill(p.key).style, left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
                  title={`${label}: ${range}`}
                />
                <span className="sr-only">{`${label}: ${range}`}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-garden-700 dark:bg-garden-300" aria-hidden="true" />
          {t("plants.detail.today")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 border-l border-dashed border-gray-500" aria-hidden="true" />
          {t("plants.detail.lastFrost", { date: formatDate(frost) })}
        </span>
      </div>

      {/* Exact dates as text, so the bars are never the only carrier of information */}
      <dl className="mt-4 hidden gap-x-6 gap-y-2 text-sm sm:grid sm:grid-cols-2">
        {phases.map((p) => (
          <div key={p.key} className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2 dark:border-white/5">
            <dt className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <PhaseSwatch phase={p.key} className="h-2.5 w-3.5" />
              {t(`plants.details.${p.key}`)}
            </dt>
            <dd className="font-medium text-gray-900 tabular-nums dark:text-gray-100">
              {t("plants.detail.window", { from: formatDate(p.start), to: formatDate(p.end) })}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
});


function PartnerChips({ ids, kind, onSelect }: { ids: string[]; kind: "good" | "bad"; onSelect: (id: string) => void }) {
  const getPlantName = usePlantName();
  const plantMap = usePlantMap();
  const Icon = kind === "good" ? Check : X;
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border py-1 pl-2 pr-3 text-sm text-gray-800 transition-colors hover:bg-gray-50 sm:min-h-9 dark:text-gray-100 dark:hover:bg-white/5 ${
            kind === "good" ? "border-positive/40" : "border-danger/40"
          }`}
        >
          <span className={`inline-flex size-5 items-center justify-center rounded-full ${kind === "good" ? "bg-positive/15 text-positive" : "bg-danger/15 text-danger"}`} aria-hidden="true">
            <Icon size={13} strokeWidth={3} />
          </span>
          <PlantIconDisplay plantId={id} emoji={plantMap.get(id)?.icon ?? ""} size={18} />
          {getPlantName(id)}
        </button>
      ))}
    </div>
  );
}

export function PlantDetail({ plant, onBack, onSelectPlant, onEdit }: PlantDetailProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatNumber, formatWeight, formatDate } = useFormat();
  const allPlants = usePlants();
  const getPlantName = usePlantName();
  const { gardens, harvests, seeds, lastFrostDate } = useStore(
    useShallow((s) => ({ gardens: s.gardens, harvests: s.harvests, seeds: s.seeds, lastFrostDate: s.lastFrostDate })),
  );

  const frost = useMemo(() => seasonFrost(lastFrostDate), [lastFrostDate]);
  const phases = useMemo(() => buildPhases(plant, frost), [plant, frost]);

  // Relations are symmetric, like in the companion matrix.
  const { good, bad } = useMemo(() => {
    const g = new Set(plant.companions);
    const b = new Set(plant.antagonists);
    for (const p of allPlants) {
      if (p.companions.includes(plant.id)) g.add(p.id);
      if (p.antagonists.includes(plant.id)) b.add(p.id);
    }
    const ids = new Set(allPlants.map((p) => p.id));
    const byName = (a: string, c: string) => getPlantName(a).localeCompare(getPlantName(c));
    return {
      good: [...g].filter((id) => ids.has(id) && id !== plant.id).sort(byName),
      bad: [...b].filter((id) => ids.has(id) && id !== plant.id && !g.has(id)).sort(byName),
    };
  }, [plant, allPlants, getPlantName]);

  const locations = useMemo(() => {
    const rows: Array<{ key: string; gardenName: string; bedName: string; env: EnvironmentType; count: number }> = [];
    for (const g of gardens) for (const b of g.beds) {
      const count = b.cells.filter((c) => c.plantId === plant.id).length;
      if (count > 0) rows.push({ key: b.id, gardenName: g.name, bedName: b.name, env: b.environmentType ?? "outdoor_bed", count });
    }
    return rows;
  }, [gardens, plant.id]);

  const harvestStats = useMemo(() => {
    const own = harvests.filter((h) => h.plantId === plant.id);
    const grams = own.reduce((s, h) => s + (h.weightGrams ?? 0), 0);
    const last = own.reduce<string | null>((acc, h) => (!acc || h.date > acc ? h.date : acc), null);
    return { count: own.length, grams, last };
  }, [harvests, plant.id]);

  const ownSeeds = useMemo(() => seeds.filter((s) => s.plantId === plant.id), [seeds, plant.id]);

  const description = t(`plants.catalog.${plant.id}.description`, { defaultValue: "" });
  const goPlanner = () => navigate("/planner", { state: { placePlantId: plant.id } });
  const goSeeds = () => navigate("/seeds", { state: { openAdd: true, prefill: { plantId: plant.id } } satisfies OpenAddState });
  const goHarvest = () => navigate("/harvest", { state: { openAdd: true, prefill: { plantId: plant.id } } satisfies OpenAddState });

  const hasStorageInfo = (plant.preservationMethods?.length ?? 0) > 0 || plant.seedSaving;

  return (
    <div>
      <PageHeader
        leading={<IconButton icon={ArrowLeft} label={t("plants.backToList")} onClick={onBack} />}
        title={
          <span className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10" aria-hidden="true">
              <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={30} />
            </span>
            {getPlantName(plant.id)}
          </span>
        }
        description={t(`plants.category.${plant.category}`)}
        actions={
          <>
            {onEdit && (
              <Button variant="ghost" onClick={onEdit}>
                <Pencil size={16} aria-hidden="true" />
                {t("common.edit")}
              </Button>
            )}
            <Button variant="secondary" onClick={goSeeds}>
              <Package size={16} aria-hidden="true" />
              {t("plants.addSeeds")}
            </Button>
            <Button onClick={goPlanner}>
              <LayoutGrid size={16} aria-hidden="true" />
              {t("plants.placeInPlanner")}
            </Button>
          </>
        }
      />

      {description && <p className="-mt-2 mb-6 max-w-3xl text-sm text-gray-700 dark:text-gray-300">{description}</p>}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Ruler}
          tone="neutral"
          label={t("plants.details.spacing")}
          value={formatNumber(plant.spacingCm)}
          unit={t("common.cm")}
          hint={t("plants.detail.rowSpacing", { value: formatNumber(plant.rowSpacingCm) })}
        />
        <StatCard
          icon={CalendarClock}
          tone="neutral"
          label={t("plants.detail.harvestAfter")}
          value={plant.harvestDaysMin === plant.harvestDaysMax
            ? formatNumber(plant.harvestDaysMin)
            : `${formatNumber(plant.harvestDaysMin)}–${formatNumber(plant.harvestDaysMax)}`}
          unit={t("plants.detail.harvestDaysUnit")}
        />
        <StatCard
          icon={Scale}
          tone="neutral"
          label={t("plants.detail.yield")}
          value={plant.expectedYieldKgPerM2 ? formatNumber(plant.expectedYieldKgPerM2) : "–"}
          unit={plant.expectedYieldKgPerM2 ? t("plants.detail.yieldUnit") : undefined}
          hint={plant.caloriesPer100g ? t("plants.detail.calories", { value: formatNumber(plant.caloriesPer100g) }) : undefined}
        />
        <StatCard
          icon={Sun}
          tone="neutral"
          label={t("plants.detail.location")}
          value={<span className="text-lg">{t(`plants.sun.${plant.sunRequirement}`)}</span>}
          hint={t("plants.detail.waterNeed", { level: t(`plants.water.${plant.waterNeed}`) })}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t("plants.detail.season")} description={t("plants.detail.seasonDesc")} />
            {phases.length > 0 ? (
              <SeasonStrip phases={phases} frost={frost} />
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300">{t("plants.detail.noFixedDates")}</p>
            )}
          </Card>

          <Card>
            <CardHeader
              title={t("plants.detail.partners")}
              actions={
                <Button variant="ghost" size="sm" onClick={() => navigate(`/companions?plant=${encodeURIComponent(plant.id)}`)}>
                  <Network size={16} aria-hidden="true" />
                  {t("plants.detail.allPartners")}
                </Button>
              }
            />
            {good.length === 0 && bad.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("plants.detail.noPartners")}</p>
            ) : (
              <div className="space-y-4">
                {good.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t("plants.details.companions")}</h3>
                    <PartnerChips ids={good} kind="good" onSelect={onSelectPlant} />
                  </section>
                )}
                {bad.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t("plants.details.antagonists")}</h3>
                    <PartnerChips ids={bad} kind="bad" onSelect={onSelectPlant} />
                  </section>
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {locations.length > 0 ? (
            <List header={t("plants.detail.inGarden")}>
              {locations.map((loc) => (
                <ListRow
                  key={loc.key}
                  leading={<EnvironmentChip type={loc.env} />}
                  title={loc.bedName}
                  meta={gardens.length > 1 ? loc.gardenName : undefined}
                  trailing={t("plants.detail.plantCount", { count: loc.count })}
                  onClick={() => navigate(`/planner?bed=${encodeURIComponent(loc.key)}`)}
                />
              ))}
            </List>
          ) : (
            <Card>
              <EmptyState
                compact
                icon={LayoutGrid}
                title={t("plants.detail.notPlanted")}
                description={t("plants.detail.notPlantedText")}
                action={<Button onClick={goPlanner}>{t("plants.placeInPlanner")}</Button>}
              />
            </Card>
          )}

          <Card>
            <CardHeader title={t("plants.detail.yourHarvests")} />
            {harvestStats.count > 0 ? (
              <>
                <p className="text-2xl font-semibold text-gray-900 tabular-nums dark:text-gray-50">{formatWeight(harvestStats.grams)}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t("plants.detail.harvestEntries", { count: harvestStats.count })}
                  {harvestStats.last && <> · {t("plants.detail.lastHarvest", { date: formatDate(harvestStats.last, "relativeInline") })}</>}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("plants.detail.noHarvests")}</p>
            )}
            <Button variant="secondary" size="sm" className="mt-4" onClick={goHarvest}>
              <Apple size={16} aria-hidden="true" />
              {t("plants.logHarvest")}
            </Button>
          </Card>

          <Card>
            <CardHeader title={t("plants.detail.seedStock")} />
            {ownSeeds.length > 0 ? (
              <ul className="divide-y divide-gray-100 text-sm dark:divide-white/5">
                {ownSeeds.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-gray-800 dark:text-gray-200">{s.variety || getPlantName(plant.id)}</span>
                    <span className="shrink-0 text-gray-600 tabular-nums dark:text-gray-300">
                      {formatNumber(s.quantity)} {t(`seeds.units.${s.unit}`)} · {s.yearAcquired}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("plants.detail.noSeeds")}</p>
            )}
            <Button variant="secondary" size="sm" className="mt-4" onClick={goSeeds}>
              <Package size={16} aria-hidden="true" />
              {t("plants.addSeeds")}
            </Button>
          </Card>

          {hasStorageInfo && (
            <Card>
              <CardHeader title={t("plants.detail.storage")} />
              {plant.preservationMethods && plant.preservationMethods.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {plant.preservationMethods.map((m) => (
                    <Badge key={m} variant="outline">{t(`preservation.methods.${m}`)}</Badge>
                  ))}
                </div>
              )}
              {plant.seedSaving && (
                <div className={plant.preservationMethods?.length ? "mt-4 border-t border-gray-100 pt-4 dark:border-white/5" : ""}>
                  <p className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                    <Leaf size={16} aria-hidden="true" className="text-gray-500 dark:text-gray-400" />
                    {t("preservation.seedSaving")}
                    <Badge tone={plant.seedSaving.difficulty === "easy" ? "positive" : plant.seedSaving.difficulty === "moderate" ? "neutral" : "warning"}>
                      {t(`preservation.difficulty.${plant.seedSaving.difficulty}`)}
                    </Badge>
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("plants.detail.viability", { count: plant.seedSaving.seedViabilityYears })}
                    {plant.seedSaving.isolationDistanceM !== undefined && plant.seedSaving.isolationDistanceM > 0 && (
                      <> · {t("plants.detail.isolation", { distance: formatNumber(plant.seedSaving.isolationDistanceM) })}</>
                    )}
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
