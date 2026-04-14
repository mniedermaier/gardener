import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { GUILDS, type PlantGuild } from "@/data/guilds";

interface Props {
  gardenId: string;
  bedId: string;
  bedWidth: number;
  bedHeight: number;
}

export function GuildPicker({ gardenId, bedId, bedWidth, bedHeight }: Props) {
  const { t } = useTranslation();
  const { setCell } = useStore(useShallow((s) => ({ setCell: s.setCell })));

  const applyGuild = (guild: PlantGuild) => {
    for (const p of guild.plants) {
      if (p.offsetX < bedWidth && p.offsetY < bedHeight) {
        setCell(gardenId, bedId, {
          cellX: p.offsetX,
          cellY: p.offsetY,
          plantId: p.plantId,
        });
      }
    }
  };

  const availableGuilds = GUILDS.filter(
    (g) => g.minWidth <= bedWidth && g.minHeight <= bedHeight
  );

  if (availableGuilds.length === 0) return null;

  return (
    <div className="mb-3">
      <p className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
        <Sparkles size={12} />
        {t("guilds.title")}
      </p>
      <div className="flex flex-wrap gap-1">
        {availableGuilds.map((guild) => (
          <button
            key={guild.id}
            onClick={() => applyGuild(guild)}
            title={t(guild.descriptionKey)}
            className="flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-xs transition-colors hover:border-garden-400 hover:bg-garden-50 dark:border-gray-700 dark:hover:border-garden-600 dark:hover:bg-garden-900/20"
          >
            <span>{guild.icon}</span>
            {t(guild.nameKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
