import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import type { PlantableNow, PlantableSoon } from "@/lib/advisor";
import { ListRow } from "@/components/ui/List";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { PhaseBadge, actionPhase } from "@/components/ui/phase";

type Item = { kind: "now"; item: PlantableNow } | { kind: "soon"; item: PlantableSoon };

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

  const items: Item[] = [...now.map((item) => ({ kind: "now" as const, item })), ...soon.map((item) => ({ kind: "soon" as const, item }))];
  const shown = expanded ? items : items.slice(0, limit);
  const hidden = items.length - shown.length;

  return (
    <>
      {shown.map(({ kind, item }) => {
        const plant = plantMap.get(item.plantId);
        if (!plant) return null;
        const date = kind === "now" ? (item as PlantableNow).until : (item as PlantableSoon).from;
        return (
          <ListRow
            key={`${item.plantId}-${item.action}`}
            leading={<PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={28} />}
            title={getPlantName(item.plantId)}
            badges={<PhaseBadge phase={actionPhase(item.action)} label={t(`advisor.actions.${item.action}`)} />}
            meta={kind === "now" ? t("calendar.until", { date: formatDate(date, "short") }) : t("calendar.from", { date: formatDate(date, "short") })}
            onClick={() => navigate(`/plants?plant=${encodeURIComponent(plant.id)}`)}
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
