import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarRange, LayoutGrid } from "lucide-react";
import { addDays, addWeeks, addYears, differenceInCalendarDays, endOfYear, setYear, startOfDay, startOfYear } from "date-fns";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { toDate, todayISO } from "@/lib/format";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Card, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { List, ListRow } from "@/components/ui/List";
import { Badge } from "@/components/ui/Badge";
import { EnvironmentChip } from "@/components/planner/environment";
import { getFrostProtectionWeeks, type EnvironmentType } from "@/types/garden";

type Phase = "sowIndoors" | "sowOutdoors" | "transplant" | "harvest";
const PHASES: Phase[] = ["sowIndoors", "sowOutdoors", "transplant", "harvest"];

/** Categorical colours for the four phases (same in legend, bars and list). */
const PHASE_BAR: Record<Phase, string> = {
  sowIndoors: "bg-violet-400 dark:bg-violet-400/80",
  sowOutdoors: "bg-garden-500 dark:bg-garden-400/80",
  transplant: "bg-sky-500 dark:bg-sky-400/80",
  harvest: "bg-amber-500 dark:bg-amber-400/80",
};

interface Range {
  start: Date;
  end: Date;
}

interface PlantTimeline {
  plantId: string;
  bedId: string;
  bedName: string;
  envType: EnvironmentType;
  phases: Partial<Record<Phase, Range>>;
}

export function SeasonTimeline() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatDate } = useFormat();
  const { gardens, lastFrostDate } = useStore(useShallow((s) => ({ gardens: s.gardens, lastFrostDate: s.lastFrostDate })));
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();
  const [filter, setFilter] = useState<string>("all");

  const todayKey = todayISO();
  const today = useMemo(() => startOfDay(toDate(todayKey) ?? new Date()), [todayKey]);
  const year = today.getFullYear();
  const yearStart = startOfYear(today);
  const yearDays = differenceInCalendarDays(endOfYear(today), yearStart) + 1;
  // The timeline shows the current season: the frost date's day and month in this year.
  const frostDate = useMemo(() => {
    const y = today.getFullYear();
    return setYear(toDate(lastFrostDate) ?? new Date(y, 4, 15), y);
  }, [lastFrostDate, today]);

  const plantedBeds = useMemo(() => {
    const beds: Array<{ id: string; name: string; envType: EnvironmentType; plantCount: number }> = [];
    for (const g of gardens) {
      for (const b of g.beds) {
        if (b.cells.length === 0) continue;
        beds.push({
          id: b.id,
          name: gardens.length > 1 ? `${g.name} · ${b.name}` : b.name,
          envType: b.environmentType ?? "outdoor_bed",
          plantCount: new Set(b.cells.map((c) => c.plantId)).size,
        });
      }
    }
    return beds;
  }, [gardens]);

  const timelines = useMemo(() => {
    const result: PlantTimeline[] = [];
    for (const g of gardens) {
      for (const bed of g.beds) {
        if (filter !== "all" && bed.id !== filter) continue;
        const effectiveFrost = addWeeks(frostDate, -getFrostProtectionWeeks(bed));
        for (const plantId of new Set(bed.cells.map((c) => c.plantId))) {
          const plant = plantMap.get(plantId);
          if (!plant) continue;
          const phases: PlantTimeline["phases"] = {};
          const window = (weeks: number | null, len: number) => {
            if (weeks === null) return undefined;
            const start = addWeeks(effectiveFrost, weeks);
            return { start, end: addWeeks(start, len) };
          };
          phases.sowIndoors = window(plant.sowIndoorsWeeks, 3);
          phases.sowOutdoors = window(plant.sowOutdoorsWeeks, 3);
          phases.transplant = window(plant.transplantWeeks, 2);
          const base = plant.transplantWeeks !== null
            ? addWeeks(effectiveFrost, plant.transplantWeeks)
            : plant.sowOutdoorsWeeks !== null ? addWeeks(effectiveFrost, plant.sowOutdoorsWeeks) : effectiveFrost;
          if (plant.harvestDaysMax < 365) {
            phases.harvest = { start: addDays(base, plant.harvestDaysMin), end: addDays(base, plant.harvestDaysMax) };
          }
          result.push({ plantId, bedId: bed.id, bedName: gardens.length > 1 ? `${g.name} · ${bed.name}` : bed.name, envType: bed.environmentType ?? "outdoor_bed", phases });
        }
      }
    }
    return result;
  }, [gardens, plantMap, frostDate, filter]);

  // Mobile list: what is running now, and what starts within the next 4 weeks.
  const agenda = useMemo(() => {
    const soon = addWeeks(today, 4);
    const now: Array<{ tl: PlantTimeline; phase: Phase; range: Range }> = [];
    const next: Array<{ tl: PlantTimeline; phase: Phase; range: Range }> = [];
    for (const tl of timelines) {
      for (const phase of PHASES) {
        const range = tl.phases[phase];
        if (!range) continue;
        if (range.start <= today && range.end >= today) now.push({ tl, phase, range });
        else if (range.start > today && range.start <= soon) next.push({ tl, phase, range });
      }
    }
    now.sort((a, b) => a.range.end.getTime() - b.range.end.getTime());
    next.sort((a, b) => a.range.start.getTime() - b.range.start.getTime());
    // Nothing starts soon (e.g. in autumn): preview the next windows, rolled into next season.
    const later: typeof next = [];
    if (next.length === 0) {
      for (const tl of timelines) {
        for (const phase of PHASES) {
          const r = tl.phases[phase];
          if (!r || r.start <= today) {
            if (r && r.end < today) later.push({ tl, phase, range: { start: addYears(r.start, 1), end: addYears(r.end, 1) } });
            continue;
          }
          later.push({ tl, phase, range: r });
        }
      }
      later.sort((a, b) => a.range.start.getTime() - b.range.start.getTime());
    }
    return { now, next, later: later.slice(0, 5) };
  }, [timelines, today]);

  if (plantedBeds.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={CalendarRange}
          title={t("calendar.timelineEmptyTitle")}
          description={t("calendar.timelineEmptyText")}
          action={<Button onClick={() => navigate("/planner")}><LayoutGrid size={16} aria-hidden="true" />{t("calendar.toPlanner")}</Button>}
        />
      </Card>
    );
  }

  const pct = (d: Date) => Math.min(100, Math.max(0, (differenceInCalendarDays(d, yearStart) / yearDays) * 100));
  const todayPct = pct(today);
  const frostPct = pct(frostDate);
  const rangeLabel = (r: Range) => `${formatDate(r.start, "short")} – ${formatDate(r.end, "short")}`;
  const phaseLabel = (p: Phase) => t(`plants.details.${p}`);

  const filterSelect = plantedBeds.length > 1 && (
    <Select
      aria-label={t("calendar.bedFilter")}
      wrapperClassName="w-full sm:w-60"
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
      options={[
        { value: "all", label: t("calendar.allBeds") },
        ...plantedBeds.map((b) => ({ value: b.id, label: `${b.name} (${b.plantCount})` })),
      ]}
    />
  );

  const agendaRow = ({ tl, phase, range }: { tl: PlantTimeline; phase: Phase; range: Range }, kind: "now" | "next") => {
    const plant = plantMap.get(tl.plantId);
    return (
      <ListRow
        key={`${tl.bedId}-${tl.plantId}-${phase}`}
        leading={plant ? <PlantIconDisplay plantId={tl.plantId} emoji={plant.icon} size={28} /> : undefined}
        title={getPlantName(tl.plantId)}
        badges={
          <Badge>
            <span className={`mr-1.5 inline-block size-2 rounded-full ${PHASE_BAR[phase]}`} aria-hidden="true" />
            {phaseLabel(phase)}
          </Badge>
        }
        meta={[
          tl.bedName,
          kind === "now"
            ? t("calendar.until", { date: formatDate(range.end, "short") })
            : t("calendar.from", { date: formatDate(range.start, "short") }),
        ].join(" · ")}
      />
    );
  };

  return (
    <>
      {/* Mobile: agenda list instead of an unreadable Gantt */}
      <div className="space-y-4 sm:hidden">
        {filterSelect}
        <List header={`${t("calendar.nowDue")} · ${agenda.now.length}`}>
          {agenda.now.length > 0
            ? agenda.now.map((a) => agendaRow(a, "now"))
            : <li className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{t("calendar.nothingNow")}</li>}
        </List>
        <List header={`${t("calendar.next4Weeks")} · ${agenda.next.length}`}>
          {agenda.next.length > 0
            ? agenda.next.map((a) => agendaRow(a, "next"))
            : <li className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{t("calendar.nothingNext")}</li>}
        </List>
        {agenda.later.length > 0 && (
          <List header={t("calendar.upNext")}>
            {agenda.later.map((a) => agendaRow(a, "next"))}
          </List>
        )}
      </div>

      {/* Desktop: season Gantt */}
      <Card className="hidden sm:block">
        <CardHeader
          title={t("calendar.timeline", { year })}
          description={t("calendar.timelineDesc", { date: formatDate(frostDate, "short") })}
          actions={filterSelect || undefined}
        />

        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Month axis with today and frost labels */}
            <div className="flex items-end gap-3">
              <div className="w-44 shrink-0" />
              <div className="relative h-10 flex-1">
                <div className="absolute inset-x-0 bottom-0 flex text-xs text-gray-500 dark:text-gray-400">
                  {Array.from({ length: 12 }, (_, m) => (
                    <div key={m} className="flex-1 border-l border-gray-200 pl-1 dark:border-white/10">{formatDate(new Date(year, m, 1), "month")}</div>
                  ))}
                </div>
                <span className="absolute top-0 -translate-x-1/2 rounded bg-garden-600 px-1.5 text-xs font-medium whitespace-nowrap text-white dark:bg-garden-500" style={{ left: `${todayPct}%` }}>
                  {t("calendar.today")}
                </span>
                {Math.abs(frostPct - todayPct) > 6 && (
                  <span className="absolute top-0 -translate-x-1/2 text-xs whitespace-nowrap text-info" style={{ left: `${frostPct}%` }}>
                    {t("calendar.lastFrost")}
                  </span>
                )}
              </div>
            </div>

            <ul className="mt-1 divide-y divide-gray-100 dark:divide-white/5">
              {timelines.map((tl) => (
                <TimelineRow
                  key={`${tl.bedId}-${tl.plantId}`}
                  tl={tl}
                  name={getPlantName(tl.plantId)}
                  icon={plantMap.get(tl.plantId)?.icon ?? ""}
                  showBed={filter === "all" && plantedBeds.length > 1}
                  pct={pct}
                  todayPct={todayPct}
                  frostPct={frostPct}
                  describe={(p, r) => `${phaseLabel(p)}: ${rangeLabel(r)}`}
                />
              ))}
            </ul>
            {timelines.length === 0 && <p className="py-4 text-center text-sm text-gray-500">{t("common.noResults")}</p>}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-600 dark:text-gray-300">
          {PHASES.map((p) => (
            <span key={p} className="flex items-center gap-1.5">
              <span className={`inline-block h-2.5 w-4 rounded-sm ${PHASE_BAR[p]}`} aria-hidden="true" />
              {phaseLabel(p)}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-0.5 bg-garden-600 dark:bg-garden-400" aria-hidden="true" />
            {t("calendar.today")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 border-l-2 border-dashed border-info" aria-hidden="true" />
            {t("calendar.lastFrost")} · {formatDate(frostDate, "short")}
          </span>
        </div>
      </Card>
    </>
  );
}

const TimelineRow = memo(function TimelineRow({
  tl, name, icon, showBed, pct, todayPct, frostPct, describe,
}: {
  tl: PlantTimeline;
  name: string;
  icon: string;
  showBed: boolean;
  pct: (d: Date) => number;
  todayPct: number;
  frostPct: number;
  describe: (p: Phase, r: Range) => string;
}) {
  const summary = PHASES.filter((p) => tl.phases[p]).map((p) => describe(p, tl.phases[p]!)).join("; ");
  return (
    <li className="flex items-center gap-3 py-1.5">
      <div className="flex w-44 shrink-0 items-center gap-2">
        <PlantIconDisplay plantId={tl.plantId} emoji={icon} size={20} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{name}</p>
          {showBed && (
            <p className="flex items-center gap-1 truncate text-xs text-gray-500 dark:text-gray-400">
              <EnvironmentChip type={tl.envType} size="sm" />
              <span className="truncate">{tl.bedName}</span>
            </p>
          )}
        </div>
      </div>
      <div className="relative h-9 flex-1 rounded-md bg-gray-50 dark:bg-white/[0.03]" role="img" aria-label={`${name}: ${summary}`}>
        {PHASES.map((p, i) => {
          const r = tl.phases[p];
          if (!r) return null;
          const left = pct(r.start);
          const width = Math.max(pct(r.end) - left, 1);
          return (
            <div
              key={p}
              className={`absolute h-[7px] rounded-sm ${PHASE_BAR[p]}`}
              style={{ left: `${left}%`, width: `${width}%`, top: `${2 + i * 8}px` }}
              title={describe(p, r)}
            />
          );
        })}
        <div className="absolute inset-y-0 border-l-2 border-dashed border-info/70" style={{ left: `${frostPct}%` }} aria-hidden="true" />
        <div className="absolute -inset-y-1.5 w-0.5 bg-garden-600 dark:bg-garden-400" style={{ left: `${todayPct}%` }} aria-hidden="true" />
      </div>
    </li>
  );
});
