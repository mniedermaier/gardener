import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, CalendarPlus, X } from "lucide-react";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { IconButton } from "@/components/ui/IconButton";
import { useToast } from "@/components/ui/Toast";
import { useToday } from "@/hooks/useToday";
import {
  defaultSuccessionConfig,
  generateSuccessionSchedule,
  successionSeason,
  type SuccessionConfig,
} from "@/lib/succession";

const INTERVALS = [1, 2, 3, 4, 5, 6];
const SOWINGS = [2, 3, 4, 5, 6, 7, 8, 10, 12];

export function SuccessionPlanner() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { formatDate } = useFormat();
  const { lastFrostDate, addTask, deleteTask, gardens } = useStore(
    useShallow((s) => ({ lastFrostDate: s.lastFrostDate, addTask: s.addTask, deleteTask: s.deleteTask, gardens: s.gardens })),
  );
  const plants = usePlants();
  const getPlantName = usePlantName();

  const today = useToday();
  // Only crops with a sowing still ahead this season; in autumn the plan is for next spring.
  const season = useMemo(() => successionSeason(plants, lastFrostDate, today), [plants, lastFrostDate, today]);
  const candidates = season.open;
  const [configs, setConfigs] = useState<SuccessionConfig[]>([]);

  const addConfig = (plantId: string) => {
    const plant = plants.find((p) => p.id === plantId);
    const config = plant ? defaultSuccessionConfig(plant) : null;
    if (!config) return;
    setConfigs((prev) => [...prev, config]);
  };

  const updateConfig = (idx: number, updates: Partial<SuccessionConfig>) =>
    setConfigs((prev) => prev.map((c, i) => (i === idx ? { ...c, ...updates } : c)));
  const removeConfig = (idx: number) => setConfigs((prev) => prev.filter((_, i) => i !== idx));

  const allTasks = useMemo(
    () => configs.flatMap((config) => generateSuccessionSchedule(config, season.frostISO)),
    [configs, season.frostISO],
  );

  const handleGenerateTasks = () => {
    const gardenId = gardens[0]?.id ?? "";
    const before = new Set(useStore.getState().tasks.map((x) => x.id));
    for (const task of allTasks) {
      addTask({
        gardenId,
        plantId: task.plantId,
        type: "sow_outdoors",
        title: t("succession.taskTitle", { n: task.sowingNumber, plant: getPlantName(task.plantId) }),
        dueDate: task.date,
      });
    }
    const added = useStore.getState().tasks.filter((x) => !before.has(x.id)).map((x) => x.id);
    toast(t("succession.added", { count: added.length }), "success", {
      action: { label: t("common.undo"), onClick: () => added.forEach(deleteTask) },
    });
    setConfigs([]);
  };

  const unusedCandidates = candidates.filter((p) => !configs.some((c) => c.plantId === p.id));

  return (
    <Card>
      <CardHeader title={t("succession.title")} description={t("succession.desc")} />

      {season.nextYear && (
        <p className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-white/5 dark:text-gray-400">
          {t("succession.nextSpring", { year: Number(season.frostISO.slice(0, 4)) })}
        </p>
      )}
      {unusedCandidates.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">{t(season.nextYear ? "succession.pickNextSpring" : "succession.pick")}</p>
          <div className="flex flex-wrap gap-1.5">
            {unusedCandidates.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addConfig(p.id)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-gray-200 px-3 text-sm text-gray-800 transition-colors hover:border-garden-400 hover:bg-garden-50 sm:min-h-9 dark:border-white/10 dark:text-gray-200 dark:hover:border-garden-500/50 dark:hover:bg-garden-500/10"
              >
                <Plus size={14} aria-hidden="true" className="text-gray-500" />
                <PlantIconDisplay plantId={p.id} emoji={p.icon} size={16} />
                {getPlantName(p.id)}
              </button>
            ))}
          </div>
        </div>
      )}

      {configs.length > 0 && (
        <>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-white/5 dark:border-white/10">
            {configs.map((config, idx) => {
              const plant = plants.find((p) => p.id === config.plantId);
              if (!plant) return null;
              const schedule = generateSuccessionSchedule(config, season.frostISO);
              const name = getPlantName(plant.id);
              return (
                <li key={config.plantId} className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={28} />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-gray-100">{name}</p>
                    <IconButton icon={X} label={t("succession.remove", { plant: name })} onClick={() => removeConfig(idx)} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-md">
                    <Select
                      label={t("succession.interval")}
                      value={String(config.intervalWeeks)}
                      onChange={(e) => updateConfig(idx, { intervalWeeks: Number(e.target.value) })}
                      options={INTERVALS.map((w) => ({ value: String(w), label: t("succession.everyWeeks", { count: w }) }))}
                    />
                    <Select
                      label={t("succession.sowings")}
                      value={String(config.numberOfSowings)}
                      onChange={(e) => updateConfig(idx, { numberOfSowings: Number(e.target.value) })}
                      options={SOWINGS.map((n) => ({ value: String(n), label: t("succession.sowingCount", { count: n }) }))}
                    />
                  </div>
                  <ol className="mt-3 flex flex-wrap gap-1.5" aria-label={t("succession.schedule")}>
                    {schedule.map((task) => (
                      <li key={task.sowingNumber} className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-white/10 dark:text-gray-300">
                        <span className="font-semibold tabular-nums text-gray-500 dark:text-gray-400">{task.sowingNumber}.</span>
                        <time dateTime={task.date}>{formatDate(task.date, "short")}</time>
                      </li>
                    ))}
                  </ol>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex justify-end">
            <Button onClick={handleGenerateTasks} disabled={gardens.length === 0}>
              <CalendarPlus size={16} aria-hidden="true" />
              {t("succession.generateCount", { count: allTasks.length })}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
