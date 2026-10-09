import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import type { AgendaBed, PlantableNow, PlantableSoon } from "@/lib/advisor";
import { ListRow } from "@/components/ui/List";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { PhaseBadge, actionPhase } from "@/components/ui/phase";

/** One row per plant: a crop can be due for different actions in different beds (lettuce: sow under glass, plant out in the raised bed). */
interface Item { kind: "now" | "soon"; plantId: string; actions: PlantableNow["action"][]; date: Date; beds: AgendaBed[] }

function groupByPlant(kind: Item["kind"], rows: Array<PlantableNow | PlantableSoon>): Item[] {
  const byPlant = new Map<string, Item>();
  for (const row of rows) {
    const date = kind === "now" ? (row as PlantableNow).until : (row as PlantableSoon).from;
    const hit = byPlant.get(row.plantId);
    if (!hit) {
      byPlant.set(row.plantId, { kind, plantId: row.plantId, actions: [row.action], date, beds: [...(row.beds ?? [])] });
      continue;
    }
    if (!hit.actions.includes(row.action)) hit.actions.push(row.action);
    // Now: open until the latest close; soon: from the earliest opening.
    if (kind === "now" ? date > hit.date : date < hit.date) hit.date = date;
    for (const b of row.beds ?? []) if (!hit.beds.some((x) => x.id === b.id)) hit.beds.push(b);
  }
  // A merged row can close later (open earlier) than its first action: sort again.
  return [...byPlant.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}

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

  const items = useMemo(() => [...groupByPlant("now", now), ...groupByPlant("soon", soon)], [now, soon]);
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
            meta={[
              item.kind === "now" ? t("calendar.until", { date: formatDate(item.date, "short") }) : t("calendar.from", { date: formatDate(item.date, "short") }),
              bedLabel(item.beds),
            ].filter(Boolean).join(" · ")}
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
