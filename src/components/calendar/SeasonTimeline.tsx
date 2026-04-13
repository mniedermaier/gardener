import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Card } from "@/components/ui/Card";
import { addWeeks, addDays, parseISO, getMonth, format } from "date-fns";
import { getFrostProtectionWeeks, ENVIRONMENT_ICONS } from "@/types/garden";

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_DE = ["Jan", "Feb", "M\u00e4r", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

interface TimeRange {
  start: number;
  end: number;
  startDate: string;
  endDate: string;
}

interface PlantTimeline {
  plantId: string;
  bedName: string;
  bedId: string;
  gardenName: string;
  envIcon: string;
  sowIndoors?: TimeRange;
  sowOutdoors?: TimeRange;
  transplant?: TimeRange;
  harvest?: TimeRange;
}

interface TooltipInfo {
  label: string;
  plant: string;
  dates: string;
  color: string;
  x: number;
  y: number;
}

function monthFraction(date: Date): number {
  return getMonth(date) + date.getDate() / 31;
}

function fmt(date: Date): string {
  return format(date, "dd.MM");
}

type FilterMode = "all" | string; // "all" or bedId

export function SeasonTimeline() {
  const { t, i18n } = useTranslation();
  const { gardens, lastFrostDate } = useStore();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();
  const months = i18n.language === "de" ? MONTHS_DE : MONTHS_EN;
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");

  // Collect all beds across gardens for the filter tabs
  const allBeds = useMemo(() => {
    const beds: Array<{ id: string; name: string; gardenName: string; envIcon: string; plantCount: number }> = [];
    for (const g of gardens) {
      for (const b of g.beds) {
        if (b.cells.length > 0) {
          beds.push({
            id: b.id,
            name: b.name,
            gardenName: g.name,
            envIcon: ENVIRONMENT_ICONS[b.environmentType ?? "outdoor_bed"],
            plantCount: new Set(b.cells.map((c) => c.plantId)).size,
          });
        }
      }
    }
    return beds;
  }, [gardens]);

  const timelines = useMemo(() => {
    const frostDate = parseISO(lastFrostDate);
    const result: PlantTimeline[] = [];

    for (const g of gardens) {
      for (const bed of g.beds) {
        if (filter !== "all" && bed.id !== filter) continue;

        const protection = getFrostProtectionWeeks(bed);
        const effectiveFrostDate = addWeeks(frostDate, -protection);
        const envType = bed.environmentType ?? "outdoor_bed";
        const uniquePlants = new Set(bed.cells.map((c) => c.plantId));

        for (const plantId of uniquePlants) {
          const plant = plantMap.get(plantId);
          if (!plant) continue;

          const tl: PlantTimeline = {
            plantId,
            bedName: bed.name,
            bedId: bed.id,
            gardenName: g.name,
            envIcon: ENVIRONMENT_ICONS[envType],
          };

          if (plant.sowIndoorsWeeks !== null) {
            const start = addWeeks(effectiveFrostDate, plant.sowIndoorsWeeks);
            const end = addWeeks(start, 3);
            tl.sowIndoors = { start: monthFraction(start), end: monthFraction(end), startDate: fmt(start), endDate: fmt(end) };
          }

          if (plant.sowOutdoorsWeeks !== null) {
            const start = addWeeks(effectiveFrostDate, plant.sowOutdoorsWeeks);
            const end = addWeeks(start, 3);
            tl.sowOutdoors = { start: monthFraction(start), end: monthFraction(end), startDate: fmt(start), endDate: fmt(end) };
          }

          if (plant.transplantWeeks !== null) {
            const start = addWeeks(effectiveFrostDate, plant.transplantWeeks);
            const end = addWeeks(start, 2);
            tl.transplant = { start: monthFraction(start), end: monthFraction(end), startDate: fmt(start), endDate: fmt(end) };
          }

          const harvestBase = plant.transplantWeeks !== null
            ? addWeeks(effectiveFrostDate, plant.transplantWeeks)
            : plant.sowOutdoorsWeeks !== null
              ? addWeeks(effectiveFrostDate, plant.sowOutdoorsWeeks)
              : effectiveFrostDate;
          const harvestStart = addDays(harvestBase, plant.harvestDaysMin);
          const harvestEnd = addDays(harvestBase, plant.harvestDaysMax);
          if (plant.harvestDaysMax < 365) {
            tl.harvest = { start: monthFraction(harvestStart), end: monthFraction(harvestEnd), startDate: fmt(harvestStart), endDate: fmt(harvestEnd) };
          }

          result.push(tl);
        }
      }
    }

    return result;
  }, [gardens, plantMap, lastFrostDate, filter]);

  if (allBeds.length === 0) return null;

  const barStyle = (range: TimeRange, color: string) => {
    const left = (range.start / 12) * 100;
    const width = Math.max(((range.end - range.start) / 12) * 100, 2);
    return { left: `${left}%`, width: `${width}%`, backgroundColor: color };
  };

  const ROW_HEIGHT = 28;
  const STRIPE_HEIGHT = 7;

  const showTooltip = (e: React.MouseEvent, label: string, plant: string, dates: string, color: string) => {
    setTooltip({ label, plant, dates, color, x: e.clientX, y: e.clientY - 50 });
  };

  const frostFraction = (monthFraction(parseISO(lastFrostDate)) / 12) * 100;

  return (
    <Card className="mt-6 overflow-x-auto">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("calendar.title")} - Timeline</h2>
        {filter !== "all" && (
          <span className="text-xs text-gray-500">
            {allBeds.find((b) => b.id === filter)?.envIcon} {allBeds.find((b) => b.id === filter)?.name}
          </span>
        )}
      </div>

      {/* Bed filter tabs */}
      {allBeds.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === "all"
                ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            {t("plants.allCategories")}
          </button>
          {allBeds.map((bed) => (
            <button
              key={bed.id}
              onClick={() => setFilter(bed.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === bed.id
                  ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {bed.envIcon} {bed.name} <span className="text-gray-400">({bed.plantCount})</span>
            </button>
          ))}
        </div>
      )}

      {/* Month headers */}
      <div className="mb-2 flex items-center gap-2 text-xs text-gray-400">
        <div className="w-36 shrink-0" />
        {months.map((m, i) => (
          <div key={i} className="flex-1 text-center">{m}</div>
        ))}
      </div>

      {/* Timeline rows */}
      <div className="space-y-1" onMouseLeave={() => setTooltip(null)}>
        {timelines.map((tl, idx) => {
          const plant = plantMap.get(tl.plantId);
          if (!plant) return null;
          const name = getPlantName(tl.plantId);
          return (
            <div key={`${tl.bedId}-${tl.plantId}-${idx}`} className="flex items-center gap-2">
              <div className="flex w-36 shrink-0 items-center gap-1.5 truncate text-xs">
                <PlantIconDisplay plantId={tl.plantId} emoji={plant.icon} size={16} />
                <span className="truncate font-medium">{name}</span>
                {filter === "all" && allBeds.length > 1 && (
                  <span className="shrink-0 text-[9px] text-gray-400" title={tl.bedName}>{tl.envIcon}</span>
                )}
              </div>
              <div className="relative flex-1 rounded bg-gray-100 dark:bg-gray-800" style={{ height: `${ROW_HEIGHT}px` }}>
                {tl.sowIndoors && (
                  <div
                    className="absolute rounded-sm opacity-85 transition-all hover:opacity-100 hover:brightness-110"
                    style={{ ...barStyle(tl.sowIndoors, "#a855f7"), top: "0px", height: `${STRIPE_HEIGHT}px` }}
                    onMouseEnter={(e) => showTooltip(e, t("plants.details.sowIndoors"), name, `${tl.sowIndoors!.startDate} – ${tl.sowIndoors!.endDate}`, "#a855f7")}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )}
                {tl.sowOutdoors && (
                  <div
                    className="absolute rounded-sm opacity-85 transition-all hover:opacity-100 hover:brightness-110"
                    style={{ ...barStyle(tl.sowOutdoors, "#22c55e"), top: `${STRIPE_HEIGHT}px`, height: `${STRIPE_HEIGHT}px` }}
                    onMouseEnter={(e) => showTooltip(e, t("plants.details.sowOutdoors"), name, `${tl.sowOutdoors!.startDate} – ${tl.sowOutdoors!.endDate}`, "#22c55e")}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )}
                {tl.transplant && (
                  <div
                    className="absolute rounded-sm opacity-85 transition-all hover:opacity-100 hover:brightness-110"
                    style={{ ...barStyle(tl.transplant, "#3b82f6"), top: `${STRIPE_HEIGHT * 2}px`, height: `${STRIPE_HEIGHT}px` }}
                    onMouseEnter={(e) => showTooltip(e, t("plants.details.transplant"), name, `${tl.transplant!.startDate} – ${tl.transplant!.endDate}`, "#3b82f6")}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )}
                {tl.harvest && (
                  <div
                    className="absolute rounded-sm opacity-85 transition-all hover:opacity-100 hover:brightness-110"
                    style={{ ...barStyle(tl.harvest, "#f59e0b"), top: `${STRIPE_HEIGHT * 3}px`, height: `${STRIPE_HEIGHT}px` }}
                    onMouseEnter={(e) => showTooltip(e, t("plants.details.harvest"), name, `${tl.harvest!.startDate} – ${tl.harvest!.endDate}`, "#f59e0b")}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )}
                <div
                  className="absolute top-0 w-px bg-red-400"
                  style={{ left: `${frostFraction}%`, height: `${ROW_HEIGHT}px` }}
                />
              </div>
            </div>
          );
        })}
        {timelines.length === 0 && (
          <p className="py-4 text-center text-xs text-gray-400">{t("common.noResults")}</p>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-gray-600 dark:bg-gray-800"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px`, transform: "translateX(-50%)" }}
        >
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tooltip.color }} />
            <span className="font-medium">{tooltip.label}</span>
          </div>
          <p className="text-gray-600 dark:text-gray-300">{tooltip.plant}</p>
          <p className="text-gray-400">{tooltip.dates}</p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#a855f7" }} /> {t("plants.details.sowIndoors")}</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#22c55e" }} /> {t("plants.details.sowOutdoors")}</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#3b82f6" }} /> {t("plants.details.transplant")}</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#f59e0b" }} /> {t("plants.details.harvest")}</span>
        <span className="flex items-center gap-1"><span className="inline-block bg-red-400" style={{ width: "2px", height: "12px" }} /> {t("settings.lastFrostDate")}</span>
      </div>
    </Card>
  );
}
