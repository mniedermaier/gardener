import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { GUILDS, type PlantGuild } from "@/data/guilds";
import { usePlantMap } from "@/hooks/usePlants";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { useToast } from "@/components/ui/Toast";

interface Props {
  gardenId: string;
  bedId: string;
  bedWidth: number;
  bedHeight: number;
}

/** Ready-made plant communities for an empty bed — one tap fills a corner. */
export const GuildPicker = memo(function GuildPicker({ gardenId, bedId, bedWidth, bedHeight }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const plantMap = usePlantMap();
  const { setCell, updateBed } = useStore(useShallow((s) => ({ setCell: s.setCell, updateBed: s.updateBed })));

  const applyGuild = (guild: PlantGuild) => {
    const before = useStore.getState().gardens.find((g) => g.id === gardenId)?.beds.find((b) => b.id === bedId)?.cells ?? [];
    let placed = 0;
    for (const p of guild.plants) {
      if (p.offsetX < bedWidth && p.offsetY < bedHeight) {
        setCell(gardenId, bedId, { cellX: p.offsetX, cellY: p.offsetY, plantId: p.plantId });
        placed++;
      }
    }
    toast(t("planner.autoFillDone", { count: placed }), "success", {
      action: { label: t("common.undo"), onClick: () => updateBed(gardenId, bedId, { cells: before }) },
    });
  };

  const availableGuilds = GUILDS.filter((g) => g.minWidth <= bedWidth && g.minHeight <= bedHeight);
  if (availableGuilds.length === 0) return null;

  return (
    <section aria-labelledby={`guilds-${bedId}`}>
      <h3 id={`guilds-${bedId}`} className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
        <Sparkles size={16} aria-hidden="true" className="text-garden-600 dark:text-garden-300" />
        {t("guilds.title")}
      </h3>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{t("guilds.hint")}</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {availableGuilds.map((guild) => {
          const ids = [...new Set(guild.plants.map((p) => p.plantId))].slice(0, 4);
          return (
            <li key={guild.id}>
              <button
                type="button"
                onClick={() => applyGuild(guild)}
                className="flex min-h-14 w-full items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:border-garden-400 hover:bg-garden-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-garden-500/50 dark:hover:bg-garden-500/10"
              >
                <span className="flex shrink-0 -space-x-1.5 pt-0.5" aria-hidden="true">
                  {ids.map((id) => {
                    const p = plantMap.get(id);
                    return p ? (
                      <span key={id} className="flex size-7 items-center justify-center rounded-full bg-white ring-2 ring-white dark:bg-gray-800 dark:ring-gray-900">
                        <PlantIconDisplay plantId={id} emoji={p.icon} size={18} />
                      </span>
                    ) : null;
                  })}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{t(guild.nameKey)}</span>
                  <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{t(guild.descriptionKey)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
});
