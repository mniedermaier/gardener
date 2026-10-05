import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Sprout } from "lucide-react";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { getPlantingAdvice } from "@/lib/advisor";
import { ListRow } from "@/components/ui/List";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

const ACTION_KEYS = {
  sow_indoors: "calendar.taskTypes.sow_indoors",
  sow_outdoors: "calendar.taskTypes.sow_outdoors",
  transplant: "calendar.taskTypes.transplant",
};

/** What to sow or plant out in the next four weeks (not yet in a bed). Rows only; the caller provides the card. */
export const PlantingAdvisor = memo(function PlantingAdvisor() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { gardens, lastFrostDate } = useStore(useShallow((s) => ({ gardens: s.gardens, lastFrostDate: s.lastFrostDate })));
  const plants = usePlants();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();

  const alreadyPlanted = useMemo(() => {
    const ids = new Set<string>();
    for (const g of gardens) for (const b of g.beds) for (const c of b.cells) ids.add(c.plantId);
    return ids;
  }, [gardens]);

  const advice = useMemo(
    () => getPlantingAdvice(plants, lastFrostDate, alreadyPlanted).slice(0, 6),
    [plants, lastFrostDate, alreadyPlanted],
  );

  if (advice.length === 0) {
    return (
      <EmptyState
        compact
        icon={Sprout}
        title={t("advisor.emptyTitle")}
        description={t("advisor.emptyText")}
        action={
          <Button variant="secondary" size="sm" onClick={() => navigate("/calendar")}>
            <CalendarDays size={14} aria-hidden="true" />
            {t("advisor.openCalendar")}
          </Button>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-gray-100 dark:divide-white/5">
      {advice.map((a) => {
        const plant = plantMap.get(a.plantId);
        if (!plant) return null;
        return (
          <ListRow
            key={`${a.plantId}-${a.action}`}
            leading={<PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={28} />}
            title={getPlantName(a.plantId)}
            meta={t(ACTION_KEYS[a.action])}
            trailing={
              a.urgency === "now"
                ? <Badge tone="brand">{t("advisor.now")}</Badge>
                : <Badge tone="neutral">{t("advisor.inWeeks", { count: a.weeksUntil })}</Badge>
            }
            onClick={() => navigate(`/plants?plant=${encodeURIComponent(plant.id)}`)}
          />
        );
      })}
    </ul>
  );
});
