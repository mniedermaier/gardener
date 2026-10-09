import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Pencil, Trash2, Wand2, TriangleAlert, ShieldCheck, Maximize2 } from "lucide-react";
import type { Bed } from "@/types/garden";
import { getFrostProtectionWeeks } from "@/types/garden";
import type { Plant } from "@/types/plant";
import { analyzeNeighbours, getCellConflicts } from "@/lib/placementValidation";
import { useFormat } from "@/hooks/useFormat";
import { Badge } from "@/components/ui/Badge";
import { Menu } from "@/components/ui/Menu";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { EnvironmentChip } from "./environment";
import { MiniBedGrid } from "./BedGrid";

interface Props {
  bed: Bed;
  plantMap: Map<string, Plant>;
  gridCellSizeCm: number;
  onOpen: (bedId: string) => void;
  onEdit: (bedId: string) => void;
  onAutoFill: (bedId: string) => void;
  onDuplicate: (bedId: string) => void;
  onDelete: (bedId: string) => void;
}

/** One bed in the overview: miniature grid, key facts, actions menu. The whole card opens the editor. */
export const BedOverviewCard = memo(function BedOverviewCard({ bed, plantMap, gridCellSizeCm, onOpen, onEdit, onAutoFill, onDuplicate, onDelete }: Props) {
  const { t } = useTranslation();
  const { formatNumber } = useFormat();
  const envType = bed.environmentType ?? "outdoor_bed";
  const frostWeeks = getFrostProtectionWeeks(bed);

  const { conflicts, conflictMap, species } = useMemo(() => {
    const { conflicts } = analyzeNeighbours(bed, plantMap);
    const counts = new Map<string, number>();
    for (const c of bed.cells) counts.set(c.plantId, (counts.get(c.plantId) ?? 0) + 1);
    const species = [...counts].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    return { conflicts, conflictMap: getCellConflicts(conflicts), species };
  }, [bed, plantMap]);

  const size = `${formatNumber((bed.width * gridCellSizeCm) / 100)} × ${formatNumber((bed.height * gridCellSizeCm) / 100)} m`;
  const shown = species.slice(0, 6);

  return (
    <article className="relative flex w-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition-colors hover:border-garden-400 dark:border-white/10 dark:bg-gray-900 dark:hover:border-garden-500/50">
      <div className="flex items-start gap-3">
        <EnvironmentChip type={envType} />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            <button
              type="button"
              onClick={() => onOpen(bed.id)}
              className="truncate text-left after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-focus"
            >
              {bed.name}
            </button>
          </h2>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {[size, t(`planner.environmentTypes.${envType}`), t("season.plants", { count: bed.cells.length })].join(" · ")}
          </p>
        </div>
        <div className="relative z-10 -mt-1 -mr-1">
          <Menu
            label={t("planner.bedActions", { name: bed.name })}
            items={[
              { label: t("planner.openBed"), icon: Maximize2, onSelect: () => onOpen(bed.id) },
              { label: t("planner.editBed"), icon: Pencil, onSelect: () => onEdit(bed.id) },
              { label: t("planner.autoFill"), icon: Wand2, onSelect: () => onAutoFill(bed.id) },
              { label: t("common.duplicate"), icon: Copy, onSelect: () => onDuplicate(bed.id) },
              "separator",
              { label: t("planner.deleteBed"), icon: Trash2, danger: true, onSelect: () => onDelete(bed.id) },
            ]}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-1 items-center justify-center overflow-hidden rounded-lg py-1">
        <MiniBedGrid bed={bed} plantMap={plantMap} conflicts={conflictMap} />
      </div>

      <div className="mt-3 flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1.5">
        {shown.length > 0 ? (
          <span className="flex items-center -space-x-1" aria-hidden="true">
            {shown.map((id) => {
              const p = plantMap.get(id);
              return p ? (
                <span key={id} className="flex size-6 items-center justify-center rounded-full bg-white ring-2 ring-white dark:bg-gray-800 dark:ring-gray-900">
                  <PlantIconDisplay plantId={id} emoji={p.icon} size={16} />
                </span>
              ) : null;
            })}
          </span>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">{t("planner.bedEmpty")}</span>
        )}
        {species.length > 0 && <span className="text-xs text-gray-500 dark:text-gray-400">{t("planner.speciesCount", { count: species.length })}</span>}
        <span className="ml-auto flex flex-wrap gap-1.5">
          {frostWeeks > 0 && <Badge tone="info" icon={ShieldCheck}>{t("planner.frostProtectionBadge", { count: frostWeeks })}</Badge>}
          {conflicts.length > 0 && <Badge tone="warning" icon={TriangleAlert}>{t("bedStats.conflictPairs", { count: conflicts.length })}</Badge>}
        </span>
      </div>
    </article>
  );
});
