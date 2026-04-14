import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Repeat, Plus, Calendar } from "lucide-react";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  SUCCESSION_PRESETS,
  generateSuccessionSchedule,
  isSuccessionCandidate,
  type SuccessionConfig,
} from "@/lib/succession";

export function SuccessionPlanner() {
  const { t } = useTranslation();
  const { lastFrostDate, addTask, gardens } = useStore(useShallow((s) => ({ lastFrostDate: s.lastFrostDate, addTask: s.addTask, gardens: s.gardens })));
  const plants = usePlants();
  const getPlantName = usePlantName();

  const candidates = useMemo(
    () => plants.filter(isSuccessionCandidate),
    [plants]
  );

  const [configs, setConfigs] = useState<SuccessionConfig[]>([]);

  const addConfig = (plantId: string) => {
    const preset = SUCCESSION_PRESETS[plantId];
    if (!preset) return;
    const plant = plants.find((p) => p.id === plantId);
    if (!plant) return;
    const startWeek = plant.sowOutdoorsWeeks ?? plant.sowIndoorsWeeks ?? -4;
    setConfigs((prev) => [
      ...prev,
      {
        plantId,
        intervalWeeks: preset.intervalWeeks,
        numberOfSowings: preset.sowings,
        startWeeksRelativeToFrost: startWeek,
      },
    ]);
  };

  const updateConfig = (idx: number, updates: Partial<SuccessionConfig>) => {
    setConfigs((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, ...updates } : c))
    );
  };

  const removeConfig = (idx: number) => {
    setConfigs((prev) => prev.filter((_, i) => i !== idx));
  };

  const allTasks = useMemo(() => {
    return configs.flatMap((config) =>
      generateSuccessionSchedule(config, lastFrostDate).map((task) => ({
        ...task,
        config,
      }))
    );
  }, [configs, lastFrostDate]);

  const handleGenerateTasks = () => {
    const gardenId = gardens[0]?.id ?? "";
    for (const task of allTasks) {
      addTask({
        gardenId,
        plantId: task.plantId,
        type: "sow_outdoors",
        title: `${t("succession.sowing")} ${task.label}: ${getPlantName(task.plantId)}`,
        dueDate: task.date,
      });
    }
  };

  const unusedCandidates = candidates.filter(
    (p) => !configs.some((c) => c.plantId === p.id)
  );

  return (
    <Card className="mt-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Repeat size={18} />
        {t("succession.title")}
      </h2>
      <p className="mb-4 text-xs text-gray-500">{t("succession.desc")}</p>

      {unusedCandidates.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1">
          {unusedCandidates.map((p) => (
            <button
              key={p.id}
              onClick={() => addConfig(p.id)}
              className="flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-xs transition-colors hover:border-garden-400 hover:bg-garden-50 dark:border-gray-700 dark:hover:border-garden-600 dark:hover:bg-garden-900/20"
            >
              <Plus size={10} />
              <PlantIconDisplay plantId={p.id} emoji={p.icon} size={14} /> {getPlantName(p.id)}
            </button>
          ))}
        </div>
      )}

      {configs.length > 0 && (
        <div className="space-y-3">
          {configs.map((config, idx) => {
            const plant = plants.find((p) => p.id === config.plantId);
            if (!plant) return null;
            const schedule = generateSuccessionSchedule(config, lastFrostDate);
            return (
              <div
                key={idx}
                className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">
                    <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={16} /> {getPlantName(plant.id)}
                  </span>
                  <button
                    onClick={() => removeConfig(idx)}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    {t("common.delete")}
                  </button>
                </div>
                <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-gray-500">{t("succession.interval")}</label>
                    <select
                      value={config.intervalWeeks}
                      onChange={(e) =>
                        updateConfig(idx, { intervalWeeks: Number(e.target.value) })
                      }
                      className="ml-2 rounded border border-gray-300 px-1 py-0.5 dark:border-gray-600 dark:bg-gray-800"
                    >
                      {[1, 2, 3, 4, 5, 6].map((w) => (
                        <option key={w} value={w}>
                          {w} {t("succession.weeks")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-500">{t("succession.sowings")}</label>
                    <select
                      value={config.numberOfSowings}
                      onChange={(e) =>
                        updateConfig(idx, {
                          numberOfSowings: Number(e.target.value),
                        })
                      }
                      className="ml-2 rounded border border-gray-300 px-1 py-0.5 dark:border-gray-600 dark:bg-gray-800"
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 10, 12].map((n) => (
                        <option key={n} value={n}>
                          {n}x
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {schedule.map((task) => (
                    <span
                      key={task.sowingNumber}
                      className="rounded bg-garden-100 px-2 py-0.5 text-xs font-medium text-garden-700 dark:bg-garden-900/30 dark:text-garden-400"
                    >
                      {task.label} {task.date}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          <Button size="sm" onClick={handleGenerateTasks}>
            <Calendar size={14} />
            {t("succession.generateTasks")} ({allTasks.length})
          </Button>
        </div>
      )}
    </Card>
  );
}
