import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Apple, LayoutGrid } from "lucide-react";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import type { HarvestReadyItem } from "@/hooks/useHarvestReady";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { ListRow } from "@/components/ui/List";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import type { OpenAddState } from "@/hooks/useOpenAddOnNavigate";

export const HarvestReady = memo(function HarvestReady({ items }: { items: HarvestReadyItem[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();

  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={Apple}
        title={t("dashboard.harvestReadyEmptyTitle")}
        description={t("dashboard.harvestReadyEmptyText")}
        action={
          <Button variant="secondary" size="sm" onClick={() => navigate("/planner")}>
            <LayoutGrid size={14} aria-hidden="true" />
            {t("dashboard.openPlanner")}
          </Button>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-gray-100 dark:divide-white/5">
      {items.slice(0, 6).map((r) => {
        const plant = plantMap.get(r.plantId);
        return (
          <ListRow
            key={r.key}
            leading={plant ? <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={28} /> : undefined}
            title={getPlantName(r.plantId)}
            meta={[r.bedName, t("dashboard.plantCount", { count: r.cells })].join(" · ")}
            trailing={r.late ? <Badge tone="warning">{t("dashboard.harvestSoon")}</Badge> : <Badge tone="positive">{t("dashboard.harvestReady")}</Badge>}
            onClick={() =>
              navigate("/harvest", {
                state: { openAdd: true, prefill: { plantId: r.plantId, bedId: r.bedId, gardenId: r.gardenId } } satisfies OpenAddState,
              })
            }
            clickLabel={t("dashboard.logHarvestFor", { name: getPlantName(r.plantId) })}
          />
        );
      })}
    </ul>
  );
});
