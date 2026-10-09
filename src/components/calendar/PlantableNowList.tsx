import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { agendaRowsByPlant, groupAgendaBedsByDate, type AgendaBed, type AgendaPlantRow, type PlantableNow, type PlantableSoon } from "@/lib/advisor";
import { ListRow } from "@/components/ui/List";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { PhaseBadge, actionPhase } from "@/components/ui/phase";
import { Badge } from "@/components/ui/Badge";
import { useFrostHold } from "@/hooks/useFrostHold";
import { isFrostSensitive } from "@/lib/weatherAlerts";
import { addDays, differenceInCalendarDays } from "date-fns";

/**
 * The agenda rows actually shown: a window that leaves three days or less after
 * the forecast frost is no real chance to plant out (lettuce in mid-October),
 * so it is dropped. Counts in headers and tabs use this too, so "· 9" always
 * matches the rows below it.
 */
export function useVisibleAgendaRows(now: PlantableNow[], soon: PlantableSoon[] = []): AgendaPlantRow[] {
  const plantMap = usePlantMap();
  const { lastFrostNight, holds } = useFrostHold();
  return useMemo(() => {
    const all = [...agendaRowsByPlant("now", now), ...agendaRowsByPlant("soon", soon)];
    if (!lastFrostNight) return all;
    return all.filter((item) => {
      const plant = plantMap.get(item.plantId);
      if (!plant || item.kind !== "now" || !holds(plant, item.actions)) return true;
      const end = new Date(Math.max(...groupAgendaBedsByDate(item).map((g) => g.date.getTime())));
      return differenceInCalendarDays(end, addDays(lastFrostNight, 1)) >= 3;
    });
  }, [now, soon, plantMap, lastFrostNight, holds]);
}

/**
 * Rows of the sowing agenda (`useSowingAgenda`): what can be sown or planted
 * now, then what opens soon. Shared by the dashboard and the calendar so both
 * always say the same. The caller provides the surrounding card/list.
 */
export const PlantableNowRows = memo(function PlantableNowRows({ now, soon, limit = 6 }: { now: PlantableNow[]; soon: PlantableSoon[]; limit?: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatDate, formatDateRange } = useFormat();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();
  const [expanded, setExpanded] = useState(false);
  // Planting out before a forecast frost night would contradict the frost
  // warning on "Heute" and "Wetter": those rows show the window after it.
  const { lastFrostNight, holds } = useFrostHold();
  const frostBlocks = (item: AgendaPlantRow, plant: Parameters<typeof isFrostSensitive>[0]) =>
    item.kind === "now" && holds(plant, item.actions);
  const windowEnd = (item: AgendaPlantRow) => new Date(Math.max(...groupAgendaBedsByDate(item).map((g) => g.date.getTime())));
  /** Some days of the window remain after the last frost night. */
  const windowAfterFrost = (item: AgendaPlantRow) => !!lastFrostNight && addDays(lastFrostNight, 1) <= windowEnd(item);
  /** "Hochbeet Süd", "Hochbeet Süd, Gewächshaus", "3 Beete". */
  const bedLabel = (beds?: AgendaBed[]) =>
    !beds || beds.length === 0 ? null : beds.length <= 2 ? beds.map((b) => b.name).join(", ") : t("advisor.bedCount", { count: beds.length });

  /**
   * Always two short parts: the date and the beds. One date for all beds:
   * "bis 17. Okt. · Hochbeet Süd". Dates that differ per bed (glass closes
   * later): the outer date with the qualifier, "bis 15. Nov. (je nach Beet) · 4 Beete"
   * — the last chance for "now", the first for "soon".
   */
  const meta = (item: AgendaPlantRow, afterFrost: boolean): string[] => {
    const key = item.kind === "now" ? "until" : "from";
    const groups = groupAgendaBedsByDate(item);
    const beds = bedLabel(groups.flatMap((g) => g.beds));
    let when: string;
    if (afterFrost && lastFrostNight) {
      // Only the days between the last frost night and the window's end count.
      when = t("calendar.afterFrostWindow", { range: formatDateRange(addDays(lastFrostNight, 1), windowEnd(item)) });
    } else if (groups.length === 1) {
      when = t(`calendar.${key}`, { date: formatDate(groups[0].date, "short") });
    } else {
      const dates = groups.map((g) => g.date.getTime());
      const outer = key === "until" ? Math.max(...dates) : Math.min(...dates);
      // Name the bed that sets the outer date ("bis 15. Nov. (Gewächshaus)").
      const setter = groups.find((g) => g.date.getTime() === outer)?.beds[0]?.name ?? "";
      when = t(`calendar.${key}ByBed`, { date: formatDate(new Date(outer), "short"), bed: setter });
    }
    return [when, beds].filter((x): x is string => !!x);
  };

  const items = useVisibleAgendaRows(now, soon);
  // "1 weitere anzeigen" hides almost nothing: show everything then.
  const shown = expanded || items.length <= limit + 1 ? items : items.slice(0, limit);
  const hidden = items.length - shown.length;

  return (
    <>
      {shown.map((item) => {
        const plant = plantMap.get(item.plantId);
        if (!plant) return null;
        return (
          <ListRow
            key={`${item.kind}-${item.plantId}`}
            leading={<PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={28} />}
            title={getPlantName(item.plantId)}
            badges={item.actions.length > 0 ? (
              <>
                {/* One phase per row (the first action), so rows never wrap into two badge lines. */}
                <PhaseBadge phase={actionPhase(item.actions[0])} label={t(`advisor.actions.${item.actions[0]}`)} />
                {/* The window closes before the frost is over: no badge-plus-date contradiction, just this. */}
                {frostBlocks(item, plant) && !windowAfterFrost(item) && (
                  <Badge tone="warning" size="sm">{t("advisor.afterFrost", { date: formatDate(addDays(lastFrostNight!, 1), "short") })}</Badge>
                )}
              </>
            ) : undefined}
            meta={meta(item, frostBlocks(item, plant) && windowAfterFrost(item))}
            onClick={() => {
              // With beds: straight to placing it (one bed: that bed; several: pick one). Indoors: the plant.
              const beds = item.beds;
              if (beds.length === 0) navigate(`/plants?plant=${encodeURIComponent(plant.id)}`);
              else navigate(beds.length === 1 ? `/planner?bed=${encodeURIComponent(beds[0].id)}` : "/planner", { state: { placePlantId: plant.id } });
            }}
          />
        );
      })}
      {hidden > 0 && (
        <li>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex min-h-11 w-full items-center px-4 text-left text-sm font-medium text-garden-700 hover:underline dark:text-garden-300"
          >
            {t("advisor.showMore", { count: hidden })}
          </button>
        </li>
      )}
    </>
  );
});
