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
import { toISODate } from "@/lib/format";
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
  // A real frost (≤ 0 °C) in the next three nights: planting out now would
  // contradict the frost warning on "Heute" and "Wetter", so those rows say so.
  const frostSoon = useMemo(() => {
    const until = toISODate(addDays(today, 3));
    return !!frost?.summary.nights.some((n) => n.tempMin <= 0 && n.date <= until);
  }, [frost, today]);
  /** "Hochbeet Süd", "Hochbeet Süd, Gewächshaus", "3 Beete". */
  const bedLabel = (beds?: AgendaBed[]) =>
    !beds || beds.length === 0 ? null : beds.length <= 2 ? beds.map((b) => b.name).join(", ") : t("advisor.bedCount", { count: beds.length });

  /**
   * Always two short parts: the date and the beds. One date for all beds:
   * "bis 17. Okt. · Hochbeet Süd". Dates that differ per bed (glass closes
   * later): "Ende je nach Beet: 10. Okt.–15. Nov. · 4 Beete" (formatDateRange,
   * one range style app-wide). Every action is a badge, never a meta part.
   */
  const meta = (item: AgendaPlantRow): string[] => {
    const key = item.kind === "now" ? "until" : "from";
    const groups = groupAgendaBedsByDate(item);
    const beds = bedLabel(groups.flatMap((g) => g.beds));
    let when: string;
    if (groups.length === 1) {
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
                {frostSoon && item.kind === "now" && !OVERWINTERING.has(plant.id)
                  && item.actions.some((a) => a === "transplant" || a === "plant_autumn")
                  && (isFrostSensitive(plant) || item.actions.includes("plant_autumn")) && (
                  <Badge tone="warning" size="sm">{t("advisor.afterFrost")}</Badge>
                )}
              </>
            ) : undefined}
            meta={meta(item)}
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
