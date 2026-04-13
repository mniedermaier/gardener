import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { usePlantMap } from "@/hooks/usePlants";
import { Card } from "@/components/ui/Card";
import { addWeeks, addDays, parseISO, getMonth, format } from "date-fns";
import { getFrostProtectionWeeks, ENVIRONMENT_ICONS } from "@/types/garden";

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_DE = ["Jan", "Feb", "M\u00e4r", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

interface PlantTimeline {
  plantId: string;
  envLabel: string;
  envIcon: string;
  sowIndoors?: { start: number; end: number };
  sowOutdoors?: { start: number; end: number };
  transplant?: { start: number; end: number };
  harvest?: { start: number; end: number };
}

function monthFraction(date: Date): number {
  return getMonth(date) + date.getDate() / 31;
}

export function SeasonTimeline() {
  const { t, i18n } = useTranslation();
  const { gardens, lastFrostDate } = useStore();
  const plantMap = usePlantMap();
  const months = i18n.language === "de" ? MONTHS_DE : MONTHS_EN;

  const timelines = useMemo(() => {
    const frostDate = parseISO(lastFrostDate);
    const result: PlantTimeline[] = [];
    const seen = new Set<string>();

    for (const g of gardens) {
      for (const bed of g.beds) {
        const protection = getFrostProtectionWeeks(bed);
        const effectiveFrostDate = addWeeks(frostDate, -protection);
        const envType = bed.environmentType ?? "outdoor_bed";
        const uniquePlants = new Set(bed.cells.map((c) => c.plantId));

        for (const plantId of uniquePlants) {
          const key = `${plantId}-${envType}-${protection}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const plant = plantMap.get(plantId);
          if (!plant) continue;

          const tl: PlantTimeline = {
            plantId,
            envLabel: protection > 0 ? t(`planner.environmentTypes.${envType}`) : "",
            envIcon: protection > 0 ? ENVIRONMENT_ICONS[envType] : "",
          };

          if (plant.sowIndoorsWeeks !== null) {
            const start = addWeeks(effectiveFrostDate, plant.sowIndoorsWeeks);
            const end = addWeeks(start, 2);
            tl.sowIndoors = { start: monthFraction(start), end: monthFraction(end) };
          }

          if (plant.sowOutdoorsWeeks !== null) {
            const start = addWeeks(effectiveFrostDate, plant.sowOutdoorsWeeks);
            const end = addWeeks(start, 2);
            tl.sowOutdoors = { start: monthFraction(start), end: monthFraction(end) };
          }

          if (plant.transplantWeeks !== null) {
            const start = addWeeks(effectiveFrostDate, plant.transplantWeeks);
            const end = addWeeks(start, 1);
            tl.transplant = { start: monthFraction(start), end: monthFraction(end) };
          }

          const harvestBase = plant.transplantWeeks !== null
            ? addWeeks(effectiveFrostDate, plant.transplantWeeks)
            : plant.sowOutdoorsWeeks !== null
              ? addWeeks(effectiveFrostDate, plant.sowOutdoorsWeeks)
              : effectiveFrostDate;
          const harvestStart = addDays(harvestBase, plant.harvestDaysMin);
          const harvestEnd = addDays(harvestBase, plant.harvestDaysMax);
          if (plant.harvestDaysMax < 365) {
            tl.harvest = { start: monthFraction(harvestStart), end: monthFraction(harvestEnd) };
          }

          result.push(tl);
        }
      }
    }

    return result;
  }, [gardens, plantMap, lastFrostDate, t]);

  if (timelines.length === 0) return null;

  const barStyle = (range: { start: number; end: number }, color: string) => {
    const left = (range.start / 12) * 100;
    const width = Math.max(((range.end - range.start) / 12) * 100, 1.5);
    return {
      left: `${left}%`,
      width: `${width}%`,
      backgroundColor: color,
    };
  };

  return (
    <Card className="mt-6 overflow-x-auto">
      <h2 className="mb-4 text-lg font-semibold">{t("calendar.title")} - Timeline</h2>
      <div className="mb-2 flex items-center gap-2 text-xs text-gray-400">
        <div className="w-32 shrink-0" />
        {months.map((m, i) => (
          <div key={i} className="flex-1 text-center">{m}</div>
        ))}
      </div>
      <div className="space-y-1">
        {timelines.map((tl, idx) => {
          const plant = plantMap.get(tl.plantId)!;
          return (
            <div key={`${tl.plantId}-${idx}`} className="flex items-center gap-2">
              <div className="w-32 shrink-0 truncate text-xs font-medium">
                <span className="mr-1">{plant.icon}</span>
                {t(`plants.catalog.${tl.plantId}.name`)}
                {tl.envIcon && <span className="ml-1 text-[10px]">{tl.envIcon}</span>}
              </div>
              <div className="relative flex-1 rounded bg-gray-100 dark:bg-gray-800" style={{ height: "20px" }}>
                {tl.sowIndoors && (
                  <div
                    className="absolute rounded-sm"
                    style={{ ...barStyle(tl.sowIndoors, "#a855f7"), top: "0px", height: "5px" }}
                    title={t("plants.details.sowIndoors")}
                  />
                )}
                {tl.sowOutdoors && (
                  <div
                    className="absolute rounded-sm"
                    style={{ ...barStyle(tl.sowOutdoors, "#22c55e"), top: "5px", height: "5px" }}
                    title={t("plants.details.sowOutdoors")}
                  />
                )}
                {tl.transplant && (
                  <div
                    className="absolute rounded-sm"
                    style={{ ...barStyle(tl.transplant, "#3b82f6"), top: "10px", height: "5px" }}
                    title={t("plants.details.transplant")}
                  />
                )}
                {tl.harvest && (
                  <div
                    className="absolute rounded-sm"
                    style={{ ...barStyle(tl.harvest, "#f59e0b"), top: "15px", height: "5px" }}
                    title={t("plants.details.harvest")}
                  />
                )}
                <div
                  className="absolute top-0 w-px bg-red-400"
                  style={{ left: `${(monthFraction(parseISO(lastFrostDate)) / 12) * 100}%`, height: "20px" }}
                  title={`${t("settings.lastFrostDate")}: ${format(parseISO(lastFrostDate), "dd.MM")}`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#a855f7" }} /> {t("plants.details.sowIndoors")}</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#22c55e" }} /> {t("plants.details.sowOutdoors")}</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#3b82f6" }} /> {t("plants.details.transplant")}</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#f59e0b" }} /> {t("plants.details.harvest")}</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-px bg-red-400" style={{ width: "2px", height: "12px" }} /> {t("settings.lastFrostDate")}</span>
      </div>
    </Card>
  );
}
