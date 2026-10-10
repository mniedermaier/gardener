import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Apple, ArrowRight, ClipboardCheck, Snowflake, type LucideIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { taskGroup } from "@/lib/tasks";
import type { FrostSummary } from "@/lib/weatherAlerts";
import { useFrostRisk } from "@/components/weather/frost";
import { familyColors, familyOf } from "@/data/plantFamilies";
import type { Bed, EnvironmentType, Garden } from "@/types/garden";
import type { HarvestReadyItem } from "@/lib/season";
import { Card, CardHeader } from "@/components/ui/Card";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { PLOT_BACKDROP } from "@/components/ui/plot";
import { useElementWidth } from "@/components/ui/charts/scale";

// ------------------------------------------------------------------ layout

const GAP_X = 16;
const GAP_Y = 10;
/** Room for a two-line bed name below each row (narrow slots wrap instead of truncating). */
const LABEL_H = 36;
/** Strip above each row for the pins, so they never cover the top row of crops. */
const PIN_H = 30;
/** A bed's slot is at least this wide so its name stays readable. */
const MIN_SLOT = 76;

export interface PlacedBed {
  bed: Bed;
  x: number;
  y: number;
  w: number;
  h: number;
  slot: number;
}

/**
 * Beds have no real positions yet (`bed.x/y` is only their order), so the map
 * packs them in shelf rows in their planner order: true proportions, one cell
 * size `u` for all beds, the largest that fits the width and `maxHeight`.
 * Each row is centred and the beds sit on a common baseline like a plan.
 */
export function packBeds(beds: Bed[], width: number, maxHeight: number): { u: number; placed: PlacedBed[]; height: number } {
  let best: { u: number; placed: PlacedBed[]; height: number } = { u: 6, placed: [], height: 0 };
  for (let u = 30; u >= 6; u -= 1) {
    const rows: PlacedBed[][] = [[]];
    let x = 0;
    let fits = true;
    for (const bed of beds) {
      const w = Math.max(1, bed.width) * u;
      const h = Math.max(1, bed.height) * u;
      const slot = Math.max(w, MIN_SLOT);
      if (slot > width) { fits = false; break; }
      if (x > 0 && x + slot > width) { rows.push([]); x = 0; }
      rows[rows.length - 1].push({ bed, x, y: 0, w, h, slot });
      x += slot + GAP_X;
    }
    if (!fits) continue;
    let y = 0;
    const placed: PlacedBed[] = [];
    for (const row of rows) {
      y += PIN_H;
      const rowH = Math.max(...row.map((p) => p.h));
      const rowW = row.reduce((s, p) => s + p.slot, 0) + GAP_X * (row.length - 1);
      const offset = Math.max(0, (width - rowW) / 2);
      for (const p of row) placed.push({ ...p, x: p.x + offset + (p.slot - p.w) / 2, y: y + rowH - p.h });
      y += rowH + LABEL_H + GAP_Y;
    }
    const height = y - GAP_Y;
    best = { u, placed, height };
    if (height <= maxHeight) return best;
  }
  return best;
}

// ------------------------------------------------------------------ look

/** Frame per environment: soil for open beds, a wooden frame for raised beds, glass for houses. */
const FRAME: Record<EnvironmentType, string> = {
  outdoor_bed: "rounded-md border border-earth-300/80 dark:border-earth-500/50",
  raised_bed: "rounded-md border-[3px] border-earth-400/80 dark:border-earth-500/70",
  greenhouse: "rounded-md border border-earth-300/70 outline-2 outline-offset-[3px] outline-water-400/70 dark:border-earth-500/50 dark:outline-water-300/50",
  polytunnel: "rounded-[40%/12%] border border-earth-300/70 outline-2 outline-offset-[3px] outline-water-300/70 dark:border-earth-500/50 dark:outline-water-300/40",
  cold_frame: "rounded-sm border border-earth-300/70 outline-2 outline-offset-2 outline-water-300/70 dark:border-earth-500/50 dark:outline-water-300/40",
  container: "rounded-2xl border-2 border-earth-400/70 dark:border-earth-500/70",
  windowsill: "rounded-sm border-2 border-gray-300 dark:border-white/20",
  vertical: "rounded-md border-2 border-dashed border-earth-400/70 dark:border-earth-500/60",
};

/** Soil: earth tint with a fine crumb texture (two offset dot grids). */
const SOIL =
  "bg-earth-200/60 dark:bg-earth-700/35 " +
  "bg-[radial-gradient(circle_at_1px_1px,rgb(92_58_30/0.16)_1px,transparent_0),radial-gradient(circle_at_4px_4px,rgb(92_58_30/0.08)_1px,transparent_0)] bg-[length:7px_7px] " +
  "dark:bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.07)_1px,transparent_0),radial-gradient(circle_at_4px_4px,rgb(255_255_255/0.04)_1px,transparent_0)]";

type PinKind = "harvest" | "task" | "frost";
// Solid discs in light mode; tinted with a tone ring in dark mode (no
// full-saturation fills on dark surfaces, DESIGN_SYSTEM).
const PIN: Record<PinKind, { icon: LucideIcon; className: string }> = {
  harvest: { icon: Apple, className: "bg-positive dark:bg-positive/25 dark:text-positive dark:ring-positive/50" },
  task: { icon: ClipboardCheck, className: "bg-warning dark:bg-warning/25 dark:text-warning dark:ring-warning/50" },
  frost: { icon: Snowflake, className: "bg-info dark:bg-info/25 dark:text-info dark:ring-info/50" },
};
const PIN_ORDER: PinKind[] = ["frost", "task", "harvest"];

function Pin({ kind, count }: { kind: PinKind; count?: number }) {
  const { icon: Icon, className } = PIN[kind];
  return (
    <span className={`inline-flex h-6 min-w-6 items-center justify-center gap-0.5 rounded-full px-1 text-xs font-semibold text-white shadow-sm ring-2 ring-white dark:shadow-none dark:ring-1 dark:backdrop-blur-sm ${className}`}>
      <Icon size={13} strokeWidth={2.25} aria-hidden="true" />
      {count !== undefined && count > 1 && <span className="tabular-nums">{count}</span>}
    </span>
  );
}

// ------------------------------------------------------------------ component

interface GardenMapProps {
  garden: Garden;
  now: Date;
  harvestReady: HarvestReadyItem[];
  frost: FrostSummary | null;
}

/**
 * Signature element of "Heute": every bed of the garden as a little plan,
 * the crops drawn in their cells, and pins for what needs you — ripe crops,
 * tasks due today or overdue, frost tonight. Each bed opens in the planner.
 */
export const GardenMap = memo(function GardenMap({ garden, now, harvestReady, frost }: GardenMapProps) {
  const { t } = useTranslation();
  const { formatNumber } = useFormat();
  const plantMap = usePlantMap();
  const plantName = usePlantName();
  const tasks = useStore(useShallow((s) => s.tasks));
  // Same beds and crops as the frost warning (lib/weatherAlerts frostRiskByBed).
  const frostRisk = useFrostRisk(frost);
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const narrow = width > 0 && width < 480;

  const status = useMemo(() => {
    const map = new Map<string, { harvest: string[]; tasks: number; frost: string[] }>();
    for (const bed of garden.beds) map.set(bed.id, { harvest: [], tasks: 0, frost: frostRisk.byBed.get(bed.id)?.plantIds ?? [] });
    for (const h of harvestReady) map.get(h.bedId)?.harvest.push(h.plantId);
    for (const task of tasks) {
      if (!task.bedId || task.completedDate) continue;
      const g = taskGroup(task, now);
      if (g === "overdue" || g === "today") {
        const s = map.get(task.bedId);
        if (s) s.tasks += 1;
      }
    }
    return map;
  }, [garden.beds, harvestReady, tasks, now, frostRisk]);

  const { u, placed, height } = useMemo(
    () => packBeds(garden.beds, Math.max(0, width - 32), narrow ? 340 : 250),
    [garden.beds, width, narrow],
  );
  const icons = u >= 18;

  const plantCount = garden.beds.reduce((s, b) => s + b.cells.length, 0);
  const present = new Set<PinKind>();
  for (const s of status.values()) {
    if (s.harvest.length) present.add("harvest");
    if (s.tasks) present.add("task");
    if (s.frost.length) present.add("frost");
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-4 pt-4 sm:px-5">
        <CardHeader
          className="mb-3"
          title={garden.name}
          description={t("dashboard.mapSummary", { count: garden.beds.length, plants: formatNumber(plantCount) })}
          actions={
            <Link to="/planner" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-garden-700 hover:underline sm:min-h-0 dark:text-garden-300">
              {t("dashboard.mapOpenPlanner")} <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
      </div>
      <div
        ref={ref}
        className={`relative mx-4 mb-3 rounded-lg p-4 sm:mx-5 ${PLOT_BACKDROP}`}
      >
        {width === 0 ? <div style={{ height: 180 }} aria-hidden="true" /> : (
          <ul aria-label={t("dashboard.mapLabel")} className="relative" style={{ height }}>
            {placed.map(({ bed, x, y, w, h, slot }) => {
              const s = status.get(bed.id)!;
              const pins = PIN_ORDER.filter((k) => (k === "harvest" ? s.harvest.length > 0 : k === "task" ? s.tasks > 0 : s.frost.length > 0));
              const parts = [
                bed.name,
                t("dashboard.mapPlants", { count: bed.cells.length }),
                s.harvest.length ? t("dashboard.mapRipe", { plants: [...new Set(s.harvest)].map(plantName).join(", ") }) : null,
                s.tasks ? t("dashboard.mapTasks", { count: s.tasks }) : null,
                s.frost.length ? t("dashboard.mapFrostPlants", { plants: s.frost.map(plantName).join(", ") }) : null,
              ].filter(Boolean);
              const paths = new Set(bed.paths ?? []);
              return (
                <li key={bed.id} className="absolute" style={{ left: x - (slot - w) / 2, top: y, width: slot }}>
                  <Link
                    to={`/planner?bed=${encodeURIComponent(bed.id)}`}
                    aria-label={parts.join(" · ")}
                    title={parts.join(" · ")}
                    className="group block rounded-md focus-visible:outline-offset-4"
                  >
                    <span
                      className={`relative mx-auto block transition-transform duration-150 group-hover:-translate-y-0.5 motion-reduce:transform-none ${SOIL} ${FRAME[bed.environmentType]}`}
                      style={{ width: w, height: h }}
                    >
                      {[...paths].map((key) => {
                        const [cx, cy] = key.split("-").map(Number);
                        return <span key={key} className="absolute bg-gray-100/80 dark:bg-white/10" style={{ left: cx * u, top: cy * u, width: u, height: u }} aria-hidden="true" />;
                      })}
                      {bed.cells.map((c) => {
                        const plant = plantMap.get(c.plantId);
                        const left = c.cellX * u;
                        const top = c.cellY * u;
                        return icons && plant ? (
                          <span key={`${c.cellX}-${c.cellY}`} className="absolute flex items-center justify-center" style={{ left, top, width: u, height: u }} aria-hidden="true">
                            <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={Math.round(u * 0.78)} />
                          </span>
                        ) : (
                          <span
                            key={`${c.cellX}-${c.cellY}`}
                            className="absolute rounded-full dark:opacity-90"
                            style={{ left: left + u * 0.2, top: top + u * 0.2, width: u * 0.6, height: u * 0.6, backgroundColor: familyColors[familyOf(c.plantId, plantMap.get(c.plantId))] }}
                            aria-hidden="true"
                          />
                        );
                      })}
                      {pins.length > 0 && (
                        // Above the bed (space reserved by packBeds), never on the crops.
                        <span className="absolute bottom-full left-1/2 mb-1.5 flex -translate-x-1/2 gap-1" aria-hidden="true">
                          {pins.map((k) => <Pin key={k} kind={k} count={k === "task" ? s.tasks : undefined} />)}
                        </span>
                      )}
                    </span>
                    {/* Two lines before an ellipsis: "Hochbeet Süd" stays readable under a narrow bed. */}
                    <span title={bed.name} className="mt-1.5 line-clamp-2 block w-full text-center text-xs leading-tight font-medium break-words text-gray-600 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-50">
                      {bed.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {present.size > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 pb-4 text-xs text-gray-600 sm:px-5 dark:text-gray-400" aria-label={t("dashboard.mapLegend")}>
          {PIN_ORDER.filter((k) => present.has(k)).map((k) => (
            <li key={k} className="inline-flex items-center gap-1.5">
              <Pin kind={k} />
              {t(`dashboard.mapPin.${k}`)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
});
