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

/**
 * Rows of the sowing agenda (`useSowingAgenda`): what can be sown or planted
 * now, then what opens soon. Shared by the dashboard and the calendar so both
 * always say the same. The caller provides the surrounding card/list.
 */
export const PlantableNowRows = memo(function PlantableNowRows({ now, soon, limit = 6 }: { now: PlantableNow[]; soon: PlantableSoon[]; limit?: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatDate } = useFormat();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();
  const [expanded, setExpanded] = useState(false);
  /** "Hochbeet Süd", "Hochbeet Süd, Gewächshaus", "3 Beete". */
  const bedLabel = (beds?: AgendaBed[]) =>
    !beds || beds.length === 0 ? null : beds.length <= 2 ? beds.map((b) => b.name).join(", ") : t("advisor.bedCount", { count: beds.length });

  /** "bis 10. Okt. · 2 Beete · Hochbeet Süd bis 17. Okt.": one date per group of beds, never a date wrong for a bed it names. */
  const meta = (item: AgendaPlantRow) => {
    const key = item.kind === "now" ? "until" : "from";
    const groups = groupAgendaBedsByDate(item);
    return groups.flatMap((g, i) => {
      const date = formatDate(g.date, "short");
      // With exceptions after it, the lead group is just counted: the line stays short, the exceptions carry the names.
      if (i === 0) return [t(`calendar.${key}`, { date }), groups.length > 1 && g.beds.length > 1 ? t("advisor.bedCount", { count: g.beds.length }) : bedLabel(g.beds)];
      return [t(`calendar.${key === "until" ? "bedsUntil" : "bedsFrom"}`, { beds: bedLabel(g.beds), date })];
    }).filter(Boolean).join(" · ");
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
            badges={item.actions.map((action) => (
              <PhaseBadge key={action} phase={actionPhase(action)} label={t(`advisor.actions.${action}`)} />
            ))}
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
