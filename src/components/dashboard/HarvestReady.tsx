import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Apple, LayoutGrid, Plus } from "lucide-react";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import type { HarvestReadyItem } from "@/hooks/useHarvestReady";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { ListRow } from "@/components/ui/List";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import type { OpenAddState } from "@/hooks/useOpenAddOnNavigate";

const LIMIT = 5;

export const HarvestReady = memo(function HarvestReady({ items }: { items: HarvestReadyItem[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();
  const [expanded, setExpanded] = useState(false);

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

  // Five rows, then "6 weitere anzeigen": the tab count always matches what can be reached.
  const shown = expanded || items.length <= LIMIT + 1 ? items : items.slice(0, LIMIT);
  const hidden = items.length - shown.length;

  return (
    <ul className="divide-y divide-gray-100 dark:divide-white/5">
      {shown.map((r) => {
        const plant = plantMap.get(r.plantId);
        return (
          <ListRow
            key={r.key}
            leading={plant ? <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={28} /> : undefined}
            title={getPlantName(r.plantId)}
            meta={[r.bedName, t("dashboard.plantCount", { count: r.cells })]}
            // The tab already says "ripe"; the row offers the action, and only "late" needs a badge.
            badges={r.late ? <Badge tone="warning">{t("dashboard.harvestSoon")}</Badge> : undefined}
            trailing={
              <span className="inline-flex items-center gap-1 text-sm font-medium text-garden-700 dark:text-garden-300">
                <Plus size={16} aria-hidden="true" />
                <span className="hidden sm:inline">{t("harvest.add")}</span>
              </span>
            }
            onClick={() =>
              navigate("/harvest", {
                state: { openAdd: true, prefill: { plantId: r.plantId, bedId: r.bedId, gardenId: r.gardenId } } satisfies OpenAddState,
              })
            }
            clickLabel={t("dashboard.logHarvestFor", { name: getPlantName(r.plantId) })}
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
    </ul>
  );
});
