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
import { useWeatherGlance } from "@/hooks/useWeatherGlance";
import { useToday } from "@/hooks/useToday";
import { useFrostSummary } from "@/components/weather/frost";
import { isFrostSensitive } from "@/lib/weatherAlerts";
import { toDate, toISODate } from "@/lib/format";
import { addDays } from "date-fns";

/** Planted in autumn on purpose to overwinter: frost does not stop them. */
const OVERWINTERING = new Set(["garlic", "onion", "currant", "gooseberry", "raspberry", "blueberry", "strawberry"]);

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
  const today = useToday();
  const glance = useWeatherGlance();
  const frost = useFrostSummary(glance.status === "ready" ? glance.data.days : undefined);
  // The last forecast frost night (≤ 0 °C) when one comes in the next three
  // nights: planting out before it would contradict the frost warning on
  // "Heute" and "Wetter", so those rows show the window after it instead.
  const lastFrostNight = useMemo(() => {
    const until = toISODate(addDays(today, 3));
    const hard = frost?.summary.nights.filter((n) => n.tempMin <= 0) ?? [];
    if (!hard.some((n) => n.date <= until)) return null;
    return toDate(hard.reduce((a, b) => (b.date > a.date ? b : a)).date);
  }, [frost, today]);
  const frostBlocks = (item: AgendaPlantRow, plant: Parameters<typeof isFrostSensitive>[0]) =>
    !!lastFrostNight && item.kind === "now" && !OVERWINTERING.has(plant.id)
    && item.actions.some((a) => a === "transplant" || a === "plant_autumn")
    && (isFrostSensitive(plant) || item.actions.includes("plant_autumn"));
  const windowEnd = (item: AgendaPlantRow) => new Date(Math.max(...groupAgendaBedsByDate(item).map((g) => g.date.getTime())));
  /** Some days of the window remain after the last frost night. */
  const windowAfterFrost = (item: AgendaPlantRow) => !!lastFrostNight && addDays(lastFrostNight, 1) <= windowEnd(item);
  /** "Hochbeet Süd", "Hochbeet Süd, Gewächshaus", "3 Beete". */
  const bedLabel = (beds?: AgendaBed[]) =>
    !beds || beds.length === 0 ? null : beds.length <= 2 ? beds.map((b) => b.name).join(", ") : t("advisor.bedCount", { count: beds.length });

  /**
   * Always two short parts: the date and the beds. One date for all beds:
   * "bis 17. Okt. · Hochbeet Süd". Dates that differ per bed (glass closes
   * later): "Ende je nach Beet: 10. Okt.–15. Nov. · 4 Beete" (formatDateRange,
   * one range style app-wide). Every action is a badge, never a meta part.
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
      when = t(`calendar.${key}Range`, { range: formatDateRange(new Date(Math.min(...dates)), new Date(Math.max(...dates))) });
    }
    return [when, beds].filter((x): x is string => !!x);
  };

  const items = useMemo(() => [...agendaRowsByPlant("now", now), ...agendaRowsByPlant("soon", soon)], [now, soon]);
  const shown = expanded ? items : items.slice(0, limit);
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
                {/* One badge per row ("Herbstsaat / Auspflanzen"), so rows never wrap into two badge lines. */}
                <PhaseBadge phase={actionPhase(item.actions[0])} label={[...new Set(item.actions.map((a) => t(`advisor.actions.${a}`)))].join(" / ")} />
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
