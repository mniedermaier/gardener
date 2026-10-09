import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { addYears, differenceInCalendarDays, endOfYear, startOfYear } from "date-fns";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft, Check, TriangleAlert, Ruler, CalendarClock, Scale, Sun, LayoutGrid, Package, Apple, Pencil, Network, Leaf, Plus,
} from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useAddBed } from "@/hooks/useAddBed";
import { useFormat } from "@/hooks/useFormat";
import { intlLocale } from "@/lib/format";
import { getPhaseWindows, seasonFrost, type PhaseWindow } from "@/lib/season";
import { plantYieldKg } from "@/lib/metrics";
import { PHASE_META, PhaseSwatch, phaseFill } from "@/components/ui/phase";
import type { Plant } from "@/types/plant";
import { getFrostProtectionWeeks, type EnvironmentType } from "@/types/garden";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { OpenAddState } from "@/hooks/useOpenAddOnNavigate";
import { PartnerChips } from "./PartnerChips";
import { familyOf } from "@/data/plantFamilies";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { List, ListRow } from "@/components/ui/List";
import { EnvironmentChip } from "@/components/planner/environment";
import { useToday } from "@/hooks/useToday";
import { useWeatherGlance } from "@/hooks/useWeatherGlance";
import { useFrostSummary } from "@/components/weather/frost";
import { isFrostSensitive } from "@/lib/weatherAlerts";
import { toDate } from "@/lib/format";

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
function buildPhases(plant: Plant, frost: Date, frostProtectionWeeks = 0): Phase[] {
  return getPhaseWindows(plant, frost, { frostProtectionWeeks }).map((w) => ({ ...w, key: w.phase }));
}

/** Where the dates apply: open field, or a protected bed type with its head start. */
interface SeasonContext { env: EnvironmentType; protection: number }

function PhaseIcon({ phase }: { phase: Phase["key"] }) {
  const Icon = PHASE_META[phase].icon;
  return <Icon size={14} aria-hidden="true" className={`shrink-0 ${PHASE_META[phase].text}`} />;
}

/** 12-month strip with one labelled row per phase and a today marker. */
const SeasonStrip = memo(function SeasonStrip({ phases, frost }: { phases: Phase[]; frost: Date }) {
  const { t } = useTranslation();
  const { formatDate, formatDateRange, locale } = useFormat();
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

  const now = useToday();
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
        <div className="hidden w-36 shrink-0 sm:block" />
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
        <div className="hidden w-36 shrink-0 sm:block" />
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
          const range = formatDateRange(p.start, p.end);
          const label = t(`plants.details.${p.key}`);
          return (
            <li key={p.key} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              {/* Label and exact dates beside the bar: the bars are never the only carrier, and no second table repeats them. */}
              <span className="flex items-baseline justify-between gap-2 text-sm sm:block sm:w-36 sm:shrink-0">
                <span className="inline-flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200">
                  <PhaseIcon phase={p.key} />
                  {label}
                </span>
                <span className="text-xs text-gray-500 tabular-nums sm:block dark:text-gray-400">{range}</span>
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
        {/* The hatch is the one non-colour cue in the bars: explain it where it occurs. */}
        {phases.some((p) => PHASE_META[p.key].hatched) && (
          <span className="inline-flex items-center gap-1.5">
            <PhaseSwatch phase="sowIndoors" className="h-2.5 w-3.5" />
            {t("plants.detail.hatchLegend")}
          </span>
        )}
      </div>

    </div>
  );
});


/** Neutral icon tile for the rows of "Dein Bestand" (same size as EnvironmentChip). */
function StockTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="inline-flex size-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300" aria-hidden="true">
      <Icon size={16} />
    </span>
  );
}

export function PlantDetail({ plant, onBack, onSelectPlant, onEdit }: PlantDetailProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addBed = useAddBed();
  const { formatNumber, formatWeight, formatDate } = useFormat();
  const allPlants = usePlants();
  const getPlantName = usePlantName();
  const { gardens, harvests, seeds, lastFrostDate, gridCellSizeCm } = useStore(
    useShallow((s) => ({ gardens: s.gardens, harvests: s.harvests, seeds: s.seeds, lastFrostDate: s.lastFrostDate, gridCellSizeCm: s.gridCellSizeCm })),
  );

  const frost = useMemo(() => seasonFrost(lastFrostDate), [lastFrostDate]);
  const hasBeds = gardens.some((g) => g.beds.length > 0);

  // The year plan follows the beds the crop actually stands in, with the same
  // head start as the calendar (greenhouse tomatoes go out weeks earlier).
  // Open field stays as a comparison when the crop only grows under cover.
  const contexts = useMemo(() => {
    const out: SeasonContext[] = [];
    for (const g of gardens) for (const b of g.beds) {
      if (!b.cells.some((c) => c.plantId === plant.id)) continue;
      const protection = getFrostProtectionWeeks(b);
      if (!out.some((c) => c.protection === protection)) out.push({ env: protection > 0 ? b.environmentType : "outdoor_bed", protection });
    }
    if (!out.some((c) => c.protection === 0)) out.push({ env: "outdoor_bed", protection: 0 });
    return out;
  }, [gardens, plant.id]);
  const [contextChoice, setContextChoice] = useState<number | null>(null);
  const context = contexts.find((c) => c.protection === contextChoice) ?? contexts[0];
  const phases = useMemo(() => buildPhases(plant, frost, context.protection), [plant, frost, context.protection]);
  const contextLabel = (c: SeasonContext) => (c.protection > 0 ? t(`planner.environmentTypes.${c.env}`) : t("plants.detail.openField"));

  // One line on where the season stands: a sowing open now, or the next one
  // (next year once this year's windows have closed — then the planner CTA
  // steps back, there is nothing to place in October).
  const today = useToday();
  const sowNote = useMemo(() => {
    const SOW: Phase["key"][] = ["sowIndoors", "sowOutdoors", "transplant"];
    const firstSow = (list: Phase[]) => list.filter((p) => SOW.includes(p.key)).sort((a, b) => a.start.getTime() - b.start.getTime());
    const open = firstSow(phases).find((p) => p.start <= today && p.end >= today);
    if (open) return { offSeason: false, text: t("plants.detail.sowNow", { date: formatDate(open.end) }) };
    const ahead = firstSow(phases).find((p) => p.start > today)
      ?? firstSow(buildPhases(plant, addYears(frost, 1), context.protection))[0];
    if (!ahead) return null;
    return { offSeason: ahead.start.getFullYear() > today.getFullYear(), text: t("plants.detail.nextSowing", { date: formatDate(ahead.start) }) };
  }, [phases, today, plant, frost, context.protection, t, formatDate]);

  // A tender crop still in its harvest window while the forecast brings a hard
  // frost: say so on the year plan instead of showing harvest "until October".
  const glance = useWeatherGlance();
  const frostSummary = useFrostSummary(glance.status === "ready" ? glance.data.days : undefined);
  const frostHarvest = useMemo(() => {
    const first = frostSummary?.summary.nights.find((n) => n.tempMin <= 0);
    // Only for a crop that actually stands in a bed: no "jetzt abernten" without plants.
    const planted = gardens.some((g) => g.beds.some((bd) => bd.cells.some((c) => c.plantId === plant.id)));
    if (!first || !planted || context.protection > 0 || !isFrostSensitive(plant)) return null;
    const inHarvest = phases.some((p) => p.key === "harvest" && p.start <= today && p.end >= today);
    return inHarvest ? toDate(first.date) : null;
  }, [frostSummary, context.protection, plant, phases, today, gardens]);

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
    const rows: Array<{ key: string; gardenName: string; bedName: string; env: EnvironmentType; count: number; conflicts: string[] }> = [];
    const badSet = new Set(bad);
    for (const g of gardens) for (const b of g.beds) {
      const count = b.cells.filter((c) => c.plantId === plant.id).length;
      // Unfavourable neighbours in the same bed: the same rule as the companion page.
      const conflicts = [...new Set(b.cells.map((c) => c.plantId).filter((id) => badSet.has(id)))];
      if (count > 0) rows.push({ key: b.id, gardenName: g.name, bedName: b.name, env: b.environmentType ?? "outdoor_bed", count, conflicts });
    }
    return rows;
  }, [gardens, plant.id, bad]);

  const harvestStats = useMemo(() => {
    const own = harvests.filter((h) => h.plantId === plant.id);
    const grams = own.reduce((s, h) => s + (h.weightGrams ?? 0), 0);
    const last = own.reduce<string | null>((acc, h) => (!acc || h.date > acc ? h.date : acc), null);
    return { count: own.length, grams, last };
  }, [harvests, plant.id]);

  const ownSeeds = useMemo(() => seeds.filter((s) => s.plantId === plant.id), [seeds, plant.id]);

  const description = t(`plants.catalog.${plant.id}.description`, { defaultValue: "" });
  // No bed yet: the button adds one (planner opens with its dialog); with beds it places the crop.
  const goPlanner = hasBeds ? () => navigate("/planner", { state: { placePlantId: plant.id } }) : addBed;
  const goSeeds = () => navigate("/seeds", { state: { openAdd: true, prefill: { plantId: plant.id } } satisfies OpenAddState });
  const goHarvest = () => navigate("/harvest", { state: { openAdd: true, prefill: { plantId: plant.id } } satisfies OpenAddState });

  const hasStorageInfo = (plant.preservationMethods?.length ?? 0) > 0 || plant.seedSaving;

  return (
    <div>
      <PageHeader
        leading={
          <>
            <IconButton icon={ArrowLeft} label={t("plants.backToList")} onClick={onBack} />
            {/* Icon beside the title block, so name and category stack as on every other page. */}
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10" aria-hidden="true">
              <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={32} />
            </span>
          </>
        }
        title={getPlantName(plant.id)}
        description={t(`plants.category.${plant.category}`)}
        actions={
          // One action in the header (seeds live in "Dein Bestand"); off-season it steps back to secondary.
          // Without beds the sowing line below carries the "add a bed" link instead.
          <>
            {hasBeds && (
              <Button variant={sowNote?.offSeason ? "secondary" : "primary"} size={sowNote?.offSeason ? "sm" : undefined} className="w-full sm:w-auto" onClick={goPlanner}>
                <LayoutGrid size={16} aria-hidden="true" />
                {t("plants.placeInPlanner")}
              </Button>
            )}
            {onEdit && (
              <Button variant="ghost" onClick={onEdit}>
                <Pencil size={16} aria-hidden="true" />
                {t("common.edit")}
              </Button>
            )}
          </>
        }
      />

      {(description || sowNote || !hasBeds || plant.caloriesPer100g) && (
        <div className="-mt-2 mb-6 max-w-3xl text-sm">
          {sowNote && (
            <div className="mb-2">
              <p className="flex items-start gap-1.5 font-medium text-garden-700 dark:text-garden-300">
                <CalendarClock size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
                {sowNote.text}
              </p>
              {/* No bed yet: the one way forward sits right under the date. */}
              {!hasBeds && (
                <Button variant="secondary" size="sm" className="mt-2" onClick={addBed}>
                  <Plus size={14} aria-hidden="true" />
                  {t("planner.addBed")}
                </Button>
              )}
            </div>
          )}
          {!hasBeds && !sowNote && (
            <p className="mb-2 text-gray-600 dark:text-gray-400">
              {t("plants.detail.bedFirstHint", { plant: getPlantName(plant.id) })}{" "}
              <button type="button" onClick={addBed} className="inline-flex min-h-11 items-center gap-1 font-semibold text-garden-700 underline underline-offset-2 dark:text-garden-300">
                <Plus size={14} aria-hidden="true" />
                {t("planner.addBed")}
              </button>
            </p>
          )}
          {description && <p className="text-gray-700 dark:text-gray-300">{description}</p>}
          {plant.caloriesPer100g ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("plants.detail.calories", { value: formatNumber(plant.caloriesPer100g) })}</p> : null}
        </div>
      )}

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
          hint={plant.expectedYieldKgPerM2 ? t("plants.detail.yieldPerPlant", { value: formatWeight(plantYieldKg(plant, gridCellSizeCm) * 1000) }) : undefined}
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
            <CardHeader
              title={t("plants.detail.season")}
              description={context.protection > 0
                ? t("plants.detail.seasonDescProtected", { place: contextLabel(context), count: context.protection })
                : t("plants.detail.seasonDesc")}
            />
            {contexts.length > 1 && (
              <SegmentedControl
                className="mb-4"
                label={t("plants.detail.seasonFor")}
                value={String(context.protection)}
                onChange={(v) => setContextChoice(Number(v))}
                options={contexts.map((c) => ({ value: String(c.protection), label: contextLabel(c) }))}
              />
            )}
            {frostHarvest && (
              <p className="mb-3">
                <Badge tone="warning" icon={TriangleAlert}>{t("plants.detail.frostHarvest", { date: formatDate(frostHarvest) })}</Badge>
              </p>
            )}
            {phases.length > 0 ? (
              <SeasonStrip phases={phases} frost={frost} />
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300">{t("plants.detail.noFixedDates")}</p>
            )}
          </Card>

          {/* Partners under the year plan, so both columns end at about the same height on wide screens. */}
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
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Check size={14} strokeWidth={3} aria-hidden="true" className="text-positive" />
                      {t("plants.details.companions")}
                    </h3>
                    <PartnerChips ids={good} kind="good" onSelect={onSelectPlant} />
                  </section>
                )}
                {bad.length > 0 && (
                  <section>
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <TriangleAlert size={14} aria-hidden="true" className="text-warning" />
                      {t("plants.details.antagonists")}
                    </h3>
                    <PartnerChips ids={bad} kind="bad" onSelect={onSelectPlant} />
                    {/* The one known reason, as on the companion page. */}
                    {(() => {
                      const same = bad.filter((id) => familyOf(id, allPlants.find((p) => p.id === id)) === familyOf(plant.id, plant));
                      return same.length > 0 ? (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{same.map((id) => getPlantName(id)).join(", ")}: {t("companions.sameFamilyReason")}</p>
                      ) : null;
                    })()}
                  </section>
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {/* Beds, harvests and seeds of this crop in one list: three half-empty cards
              (each with its own button repeating the header actions) read as noise. */}
          {locations.length === 0 && harvestStats.count === 0 && ownSeeds.length === 0 ? (
            // Nothing yet: one muted line instead of three empty rows.
            <Card>
              <CardHeader title={t("plants.detail.yourStock")} description={t("plants.detail.stockEmpty", { plant: getPlantName(plant.id) })} />
              <Button variant="ghost" size="sm" className="-ml-2 -mt-2" onClick={goSeeds}>
                <Plus size={16} aria-hidden="true" />
                {t("plants.addSeeds")}
              </Button>
            </Card>
          ) : (
          // Same card title style as "Haltbarmachen & Saatgut" next to it.
          <Card padding="none">
          <div className="px-4 pt-4 sm:px-6 sm:pt-6">
            <CardHeader title={t("plants.detail.yourStock")} className="mb-2" />
          </div>
          <List bare label={t("plants.detail.yourStock")}>

            {locations.length > 0 ? locations.map((loc) => (
              <ListRow
                key={loc.key}
                leading={<EnvironmentChip type={loc.env} />}
                title={loc.bedName}
                meta={gardens.length > 1 ? loc.gardenName : undefined}
                badges={loc.conflicts.length > 0
                  ? <Badge tone="warning" size="sm" icon={TriangleAlert}>{t("plants.detail.sameBedConflict", { plants: loc.conflicts.map(getPlantName).join(", ") })}</Badge>
                  : undefined}
                trailing={t("plants.detail.plantCount", { count: loc.count })}
                onClick={() => navigate(`/planner?bed=${encodeURIComponent(loc.key)}`)}
              />
            )) : (
              // Every row of this list is tappable (chevron), so none looks disabled.
              <ListRow muted leading={<StockTile icon={LayoutGrid} />} title={t("plants.detail.notPlanted")} onClick={hasBeds ? goPlanner : undefined} />
            )}
            <ListRow
              muted={harvestStats.count === 0}
              leading={<StockTile icon={Apple} />}
              title={t("plants.detail.yourHarvests")}
              onClick={harvestStats.count > 0 ? () => navigate("/harvest") : goHarvest}
              // Weight and count as meta parts, the last date on its own line: three parts
              // wrapped in the narrow column and left a "·" hanging at the line end.
              meta={harvestStats.count > 0
                ? [formatWeight(harvestStats.grams), t("plants.detail.harvestEntries", { count: harvestStats.count })]
                : t("plants.detail.noHarvests")}
              description={harvestStats.count > 0 && harvestStats.last
                ? <span className="text-xs text-gray-500 dark:text-gray-400">{t("plants.detail.lastHarvest", { date: formatDate(harvestStats.last, "relativeInline") })}</span>
                : undefined}
              // Nothing to harvest from while the crop stands in no bed (and none was harvested yet).
              actions={locations.length > 0 || harvestStats.count > 0 ? <IconButton icon={Plus} label={t("plants.logHarvest")} onClick={goHarvest} /> : undefined}
            />
            {ownSeeds.length > 0 ? ownSeeds.map((s, i) => (
              <ListRow
                key={s.id}
                // The add action sits on the first seed row (the header has no action slot).
                actions={i === 0 ? <IconButton icon={Plus} label={t("plants.addSeeds")} onClick={goSeeds} /> : undefined}
                leading={<StockTile icon={Package} />}
                title={s.variety || t("plants.detail.seedStock")}
                meta={[t(`seeds.unitCount.${s.unit}`, { count: s.quantity, n: formatNumber(s.quantity) }), String(s.yearAcquired)]}
                onClick={() => navigate("/seeds")}
              />
            )) : (
              <ListRow
                muted
                leading={<StockTile icon={Package} />}
                title={t("plants.detail.seedStock")}
                meta={t("plants.detail.noSeeds")}
                actions={<IconButton icon={Plus} label={t("plants.addSeeds")} onClick={goSeeds} />}
              />
            )}
          </List>
          </Card>
          )}

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
