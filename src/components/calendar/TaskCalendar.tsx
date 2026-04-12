import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Check, Calendar, AlertCircle, Download } from "lucide-react";
import { useStore } from "@/store";
import { usePlantMap } from "@/hooks/usePlants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import type { TaskType } from "@/types/task";
import { getFrostProtectionWeeks } from "@/types/garden";
import { SeasonTimeline } from "./SeasonTimeline";
import { SuccessionPlanner } from "./SuccessionPlanner";
import { downloadIcal } from "@/lib/ical";
import { format, isAfter, isBefore, startOfWeek, endOfWeek, addWeeks, parseISO } from "date-fns";

const taskTypeColors: Record<TaskType, string> = {
  sow_indoors: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  sow_outdoors: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  transplant: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  water: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  harvest: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  custom: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const taskTypes: TaskType[] = ["sow_indoors", "sow_outdoors", "transplant", "water", "harvest", "custom"];

export function TaskCalendar() {
  const { t } = useTranslation();
  const { tasks, gardens, lastFrostDate, addTask, completeTask, generateTasks } = useStore();
  const plantMap = usePlantMap();
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<TaskType>("custom");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const twoWeeksOut = addWeeks(weekEnd, 2);

  const { overdue, thisWeek, upcoming, completed } = useMemo(() => {
    const overdue = tasks.filter((t) => !t.completedDate && isBefore(parseISO(t.dueDate), weekStart));
    const thisWeek = tasks.filter(
      (t) => !t.completedDate && !isBefore(parseISO(t.dueDate), weekStart) && !isAfter(parseISO(t.dueDate), weekEnd)
    );
    const upcoming = tasks.filter(
      (t) => !t.completedDate && isAfter(parseISO(t.dueDate), weekEnd) && !isAfter(parseISO(t.dueDate), twoWeeksOut)
    );
    const completed = tasks.filter((t) => t.completedDate).slice(-10);
    return { overdue, thisWeek, upcoming, completed };
  }, [tasks, weekStart, weekEnd, twoWeeksOut]);

  const handleGenerateTasks = () => {
    for (const garden of gardens) {
      const plantings: Array<{ plantId: string; bedId: string; type: TaskType; title: string; dueDate: string }> = [];
      const frostDate = parseISO(lastFrostDate);

      for (const bed of garden.beds) {
        const protection = getFrostProtectionWeeks(bed);
        const effectiveFrostDate = addWeeks(frostDate, -protection);
        const envLabel = protection > 0 ? ` (${t(`planner.environmentTypes.${bed.environmentType ?? "outdoor_bed"}`)})` : "";
        const uniquePlants = new Set(bed.cells.map((c) => c.plantId));
        for (const plantId of uniquePlants) {
          const plant = plantMap.get(plantId);
          if (!plant) continue;
          const name = t(`plants.catalog.${plantId}.name`) + envLabel;

          if (plant.sowIndoorsWeeks !== null) {
            const date = addWeeks(effectiveFrostDate, plant.sowIndoorsWeeks);
            plantings.push({
              plantId,
              bedId: bed.id,
              type: "sow_indoors",
              title: `${t("calendar.taskTypes.sow_indoors")}: ${name}`,
              dueDate: format(date, "yyyy-MM-dd"),
            });
          }
          if (plant.sowOutdoorsWeeks !== null) {
            const date = addWeeks(effectiveFrostDate, plant.sowOutdoorsWeeks);
            plantings.push({
              plantId,
              bedId: bed.id,
              type: "sow_outdoors",
              title: `${t("calendar.taskTypes.sow_outdoors")}: ${name}`,
              dueDate: format(date, "yyyy-MM-dd"),
            });
          }
          if (plant.transplantWeeks !== null) {
            const date = addWeeks(effectiveFrostDate, plant.transplantWeeks);
            plantings.push({
              plantId,
              bedId: bed.id,
              type: "transplant",
              title: `${t("calendar.taskTypes.transplant")}: ${name}`,
              dueDate: format(date, "yyyy-MM-dd"),
            });
          }
        }
      }
      if (plantings.length > 0) {
        generateTasks(garden.id, plantings);
      }
    }
  };

  const handleAddTask = () => {
    if (!newTitle.trim()) return;
    addTask({
      gardenId: gardens[0]?.id ?? "",
      type: newType,
      title: newTitle.trim(),
      dueDate: newDate,
    });
    setNewTitle("");
    setShowAddTask(false);
  };

  const renderTaskList = (taskList: typeof tasks, label: string, icon: React.ReactNode) => {
    if (taskList.length === 0) return null;
    return (
      <div className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
          {icon} {label} ({taskList.length})
        </h2>
        <div className="space-y-2">
          {taskList.map((task) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 ${
                task.completedDate ? "opacity-60" : ""
              }`}
            >
              <button
                onClick={() => !task.completedDate && completeTask(task.id)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  task.completedDate
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-gray-300 hover:border-garden-500"
                }`}
              >
                {task.completedDate && <Check size={12} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${task.completedDate ? "line-through" : ""}`}>{task.title}</p>
                <p className="text-xs text-gray-400">{task.dueDate}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs ${taskTypeColors[task.type]}`}>
                {t(`calendar.taskTypes.${task.type}`)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("calendar.title")}</h1>
        <div className="flex gap-2">
          {tasks.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => downloadIcal(tasks)} title="iCal Export">
              <Download size={16} />
            </Button>
          )}
          {gardens.some((g) => g.beds.some((b) => b.cells.length > 0)) && (
            <Button variant="secondary" size="sm" onClick={handleGenerateTasks}>
              <Calendar size={16} />
              Generate
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAddTask(true)}>
            <Plus size={16} />
            {t("calendar.addTask")}
          </Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500">{t("calendar.noTasks")}</p>
        </Card>
      ) : (
        <>
          {renderTaskList(overdue, t("calendar.overdue"), <AlertCircle size={14} className="text-red-500" />)}
          {renderTaskList(thisWeek, t("calendar.thisWeek"), <Calendar size={14} className="text-garden-500" />)}
          {renderTaskList(upcoming, t("calendar.upcoming"), <Calendar size={14} className="text-blue-500" />)}
          {renderTaskList(completed, t("calendar.completed"), <Check size={14} className="text-green-500" />)}
        </>
      )}

      <SeasonTimeline />
      <SuccessionPlanner />

      <Modal open={showAddTask} onClose={() => setShowAddTask(false)} title={t("calendar.addTask")}>
        <div className="space-y-4">
          <Input label="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
            <div className="flex flex-wrap gap-2">
              {taskTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setNewType(type)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    newType === type ? taskTypeColors[type] + " ring-2 ring-offset-1 ring-garden-500" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {t(`calendar.taskTypes.${type}`)}
                </button>
              ))}
            </div>
          </div>
          <Input label="Date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddTask(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAddTask}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
