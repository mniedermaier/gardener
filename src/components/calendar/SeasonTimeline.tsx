import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarRange, LayoutGrid } from "lucide-react";
import { addWeeks, addYears, differenceInCalendarDays, endOfYear, startOfDay, startOfYear } from "date-fns";
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
import { List, ListRow } from "@/components/ui/List";
import { EnvironmentChip } from "@/components/planner/environment";
import { getFrostProtectionWeeks, type EnvironmentType } from "@/types/garden";
import { PHASES, getPhaseWindows, seasonFrost, type Phase } from "@/lib/season";
import { PhaseBadge, PhaseLegend, phaseFill } from "@/components/ui/phase";
import { PlantableNowRows } from "./PlantableNowList";
import { useSowingAgenda } from "@/hooks/useSowingAgenda";
import { agendaPlantCount } from "@/lib/advisor";
import { useToday } from "@/hooks/useToday";

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

/** Rows of "Jetzt dran" before "n weitere anzeigen" — the same cap as the sowing list. */
const NOW_LIMIT = 8;

export function SeasonTimeline() {
  const now = useToday();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatDate } = useFormat();
  const { gardens, lastFrostDate } = useStore(useShallow((s) => ({ gardens: s.gardens, lastFrostDate: s.lastFrostDate })));
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();
  const [filter, setFilter] = useState<string>("all");
  const [nowExpanded, setNowExpanded] = useState(false);
  const sowing = useSowingAgenda();
  const plantableCount = agendaPlantCount(sowing.now);

  const todayKey = todayISO();
  const today = useMemo(() => startOfDay(toDate(todayKey) ?? now), [todayKey, now]);
  const year = today.getFullYear();
  const yearStart = startOfYear(today);
  const yearDays = differenceInCalendarDays(endOfYear(today), yearStart) + 1;
  // The timeline shows the current season: the frost date's day and month in this year.
  const frostDate = useMemo(() => seasonFrost(lastFrostDate, today), [lastFrostDate, today]);

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
        const protection = getFrostProtectionWeeks(bed);
        for (const plantId of new Set(bed.cells.map((c) => c.plantId))) {
          const plant = plantMap.get(plantId);
          if (!plant) continue;
          const phases: PlantTimeline["phases"] = {};
          for (const w of getPhaseWindows(plant, frostDate, { frostProtectionWeeks: protection })) phases[w.phase] = { start: w.start, end: w.end };
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


  // Same agenda as the dashboard: what can be sown or planted, planted or not.
  const sowingList = sowing.now.length + sowing.soon.length > 0 && (
    <List header={`${t("advisor.title")} · ${plantableCount}`}>
      <PlantableNowRows now={sowing.now} soon={sowing.soon} limit={8} />
    </List>
  );

  if (plantedBeds.length === 0) {
    // Without beds the sowing list is the useful part: it leads, the missing season plan is one hint line.
    return (
      <div className="space-y-4">
        {sowingList}
        <Card padding="sm" className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300" aria-hidden="true">
            <CalendarRange size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t("calendar.timelineEmptyTitle")}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("calendar.timelineEmptyText")}</p>
          </div>
          <Button variant="secondary" className="self-start sm:self-center" onClick={() => navigate("/planner")}>
            <LayoutGrid size={16} aria-hidden="true" />
            {t("calendar.toPlanner")}
          </Button>
        </Card>
      </div>
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

  // A phase badge only where a list mixes phases; one phase moves into the header ("Jetzt dran · Ernte · 11").
  const onePhase = (items: { phase: Phase }[]) => (items.length > 0 && new Set(items.map((a) => a.phase)).size === 1 ? items[0].phase : null);
  const nowPhase = onePhase(agenda.now);
  const nextPhase = onePhase(agenda.next);
  const agendaRow = ({ tl, phase, range }: { tl: PlantTimeline; phase: Phase; range: Range }, kind: "now" | "next", showPhase = true) => {
    const plant = plantMap.get(tl.plantId);
    return (
      <ListRow
        key={`${tl.bedId}-${tl.plantId}-${phase}`}
        leading={plant ? <PlantIconDisplay plantId={tl.plantId} emoji={plant.icon} size={28} /> : undefined}
        title={getPlantName(tl.plantId)}
        badges={showPhase ? <PhaseBadge phase={phase} /> : undefined}
        meta={[
          tl.bedName,
          kind === "now"
            ? t("calendar.until", { date: formatDate(range.end, "short") })
            : t("calendar.from", { date: formatDate(range.start, "short") }),
        ]}
        // Same behaviour as the sowing rows below: every agenda row opens its plant.
        onClick={() => navigate(`/plants?plant=${encodeURIComponent(tl.plantId)}`)}
      />
    );
  };

  return (
    <>
      {/* Mobile: agenda list instead of an unreadable Gantt */}
      <div className="space-y-4 sm:hidden">
        {filterSelect}
        <List headingLevel={2} header={[t("calendar.nowDue"), nowPhase && phaseLabel(nowPhase), agenda.now.length].filter((x) => x !== null).join(" · ")}>
          {agenda.now.length > 0
            ? (nowExpanded ? agenda.now : agenda.now.slice(0, NOW_LIMIT)).map((a) => agendaRow(a, "now", nowPhase === null))
            : <li className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{t("calendar.nothingNow")}</li>}
          {/* Same cap as the sowing list below. */}
          {!nowExpanded && agenda.now.length > NOW_LIMIT && (
            <li>
              <button
                type="button"
                onClick={() => setNowExpanded(true)}
                className="flex min-h-11 w-full items-center px-4 text-left text-sm font-medium text-garden-700 hover:underline dark:text-garden-300"
              >
                {t("advisor.showMore", { count: agenda.now.length - NOW_LIMIT })}
              </button>
            </li>
          )}
        </List>
        {agenda.next.length > 0 && (
          <List headingLevel={2} header={[t("calendar.next4Weeks"), nextPhase && phaseLabel(nextPhase), agenda.next.length].filter((x) => x !== null).join(" · ")}>
            {agenda.next.map((a) => agendaRow(a, "next", nextPhase === null))}
          </List>
        )}
        {sowingList}
        {/* Nothing starts in the next 4 weeks: the header says when the next window opens,
            instead of a separate "nothing new" line above a list of things to sow. */}
        {agenda.later.length > 0 && (
          <List headingLevel={2} header={t("calendar.upNextFrom", { date: formatDate(agenda.later[0].range.start, "short") })}>
            {agenda.later.map((a) => agendaRow(a, "next"))}
          </List>
        )}
        {agenda.next.length === 0 && agenda.later.length === 0 && !sowingList && (
          <p className="px-1 text-sm text-gray-500 dark:text-gray-400">{t("calendar.nothingNextLine")}</p>
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
                <span className="absolute top-0 -translate-x-1/2 rounded bg-garden-600 px-1.5 text-xs font-medium whitespace-nowrap text-white dark:bg-garden-700" style={{ left: `${todayPct}%` }}>
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
          <PhaseLegend phases={PHASES} />
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
      {sowingList && <div className="hidden sm:block">{sowingList}</div>}
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
          const fill = phaseFill(p);
          return (
            <div
              key={p}
              className={`absolute h-[7px] rounded-sm ${fill.className}`}
              style={{ ...fill.style, left: `${left}%`, width: `${width}%`, top: `${2 + i * 8}px` }}
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
