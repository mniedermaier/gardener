import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Check, Calendar, Download, Trash2, Filter } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { Task, TaskType } from "@/types/task";
import { getFrostProtectionWeeks } from "@/types/garden";
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

type ViewFilter = "active" | "overdue" | "thisWeek" | "upcoming" | "completed" | "all";
type TypeFilter = "all" | TaskType;

export function TaskCalendar() {
  const { t } = useTranslation();
  const { toast, confirm } = useToast();
  const { tasks, gardens, lastFrostDate, addTask, completeTask, deleteTask, generateTasks } = useStore(
    useShallow((s) => ({
      tasks: s.tasks, gardens: s.gardens, lastFrostDate: s.lastFrostDate,
      addTask: s.addTask, completeTask: s.completeTask, deleteTask: s.deleteTask, generateTasks: s.generateTasks,
    }))
  );
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<TaskType>("custom");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [viewFilter, setViewFilter] = useState<ViewFilter>("active");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const counts = useMemo(() => {
    const overdue = tasks.filter((t) => !t.completedDate && isBefore(parseISO(t.dueDate), weekStart)).length;
    const thisWeek = tasks.filter((t) => !t.completedDate && !isBefore(parseISO(t.dueDate), weekStart) && !isAfter(parseISO(t.dueDate), weekEnd)).length;
    const upcoming = tasks.filter((t) => !t.completedDate && isAfter(parseISO(t.dueDate), weekEnd)).length;
    const completed = tasks.filter((t) => t.completedDate).length;
    const active = tasks.filter((t) => !t.completedDate).length;
    return { overdue, thisWeek, upcoming, completed, active, all: tasks.length };
  }, [tasks, weekStart, weekEnd]);

  const filtered = useMemo(() => {
    let list = [...tasks];

    // View filter
    if (viewFilter === "active") list = list.filter((t) => !t.completedDate);
    else if (viewFilter === "overdue") list = list.filter((t) => !t.completedDate && isBefore(parseISO(t.dueDate), weekStart));
    else if (viewFilter === "thisWeek") list = list.filter((t) => !t.completedDate && !isBefore(parseISO(t.dueDate), weekStart) && !isAfter(parseISO(t.dueDate), weekEnd));
    else if (viewFilter === "upcoming") list = list.filter((t) => !t.completedDate && isAfter(parseISO(t.dueDate), weekEnd));
    else if (viewFilter === "completed") list = list.filter((t) => t.completedDate);

    // Type filter
    if (typeFilter !== "all") list = list.filter((t) => t.type === typeFilter);

    // Sort: overdue first, then by date
    list.sort((a, b) => {
      if (a.completedDate && !b.completedDate) return 1;
      if (!a.completedDate && b.completedDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

    return list;
  }, [tasks, viewFilter, typeFilter, weekStart, weekEnd]);

  const handleGenerateTasks = () => {
    let count = 0;
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
          const name = getPlantName(plantId) + envLabel;

          if (plant.sowIndoorsWeeks !== null) {
            plantings.push({ plantId, bedId: bed.id, type: "sow_indoors", title: `${t("calendar.taskTypes.sow_indoors")}: ${name}`, dueDate: format(addWeeks(effectiveFrostDate, plant.sowIndoorsWeeks), "yyyy-MM-dd") });
          }
          if (plant.sowOutdoorsWeeks !== null) {
            plantings.push({ plantId, bedId: bed.id, type: "sow_outdoors", title: `${t("calendar.taskTypes.sow_outdoors")}: ${name}`, dueDate: format(addWeeks(effectiveFrostDate, plant.sowOutdoorsWeeks), "yyyy-MM-dd") });
          }
          if (plant.transplantWeeks !== null) {
            plantings.push({ plantId, bedId: bed.id, type: "transplant", title: `${t("calendar.taskTypes.transplant")}: ${name}`, dueDate: format(addWeeks(effectiveFrostDate, plant.transplantWeeks), "yyyy-MM-dd") });
          }
        }
      }
      if (plantings.length > 0) {
        count += plantings.length;
        generateTasks(garden.id, plantings);
      }
    }
    toast(t("calendar.generated", { count }), "success");
  };

  const handleAddTask = () => {
    if (!newTitle.trim()) return;
    addTask({ gardenId: gardens[0]?.id ?? "", type: newType, title: newTitle.trim(), dueDate: newDate });
    setNewTitle("");
    setShowAddTask(false);
  };

  const handleDeleteCompleted = async () => {
    const completedTasks = tasks.filter((t) => t.completedDate);
    if (completedTasks.length === 0) return;
    if (await confirm(t("calendar.deleteCompletedConfirm", { count: completedTasks.length }))) {
      for (const task of completedTasks) deleteTask(task.id);
      toast(t("calendar.deletedCompleted", { count: completedTasks.length }), "success");
    }
  };

  const isOverdue = (task: Task) => !task.completedDate && isBefore(parseISO(task.dueDate), weekStart);
  const isThisWeek = (task: Task) => !task.completedDate && !isBefore(parseISO(task.dueDate), weekStart) && !isAfter(parseISO(task.dueDate), weekEnd);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("nav.tasks")}</h1>
        <div className="flex gap-2">
          {tasks.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => downloadIcal(tasks)} title="iCal">
              <Download size={16} />
            </Button>
          )}
          {gardens.some((g) => g.beds.some((b) => b.cells.length > 0)) && (
            <Button variant="secondary" size="sm" onClick={handleGenerateTasks}>
              <Calendar size={16} />
              {t("calendar.generate")}
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAddTask(true)}>
            <Plus size={16} />
            {t("calendar.addTask")}
          </Button>
        </div>
      </div>

      {/* Stats row */}
      {tasks.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {([
            { key: "active" as ViewFilter, count: counts.active, color: "text-garden-600", label: t("calendar.active") },
            { key: "overdue" as ViewFilter, count: counts.overdue, color: "text-red-600", label: t("calendar.overdue") },
            { key: "thisWeek" as ViewFilter, count: counts.thisWeek, color: "text-blue-600", label: t("calendar.thisWeek") },
            { key: "upcoming" as ViewFilter, count: counts.upcoming, color: "text-gray-600", label: t("calendar.upcoming") },
            { key: "completed" as ViewFilter, count: counts.completed, color: "text-green-600", label: t("calendar.completed") },
          ]).map((s) => (
            <button
              key={s.key}
              onClick={() => setViewFilter(s.key)}
              className={`rounded-lg border p-2 text-center transition-colors ${
                viewFilter === s.key
                  ? "border-garden-400 bg-garden-50 dark:border-garden-600 dark:bg-garden-900/20"
                  : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              }`}
            >
              <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[10px] text-gray-500">{s.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Type filter */}
      {tasks.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1">
          <button onClick={() => setShowFilters(!showFilters)} className="mr-1 text-gray-400 hover:text-gray-600">
            <Filter size={14} />
          </button>
          {(showFilters || typeFilter !== "all") && (
            <>
              <button
                onClick={() => setTypeFilter("all")}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeFilter === "all" ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}
              >
                {t("plants.allCategories")}
              </button>
              {taskTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeFilter === type ? taskTypeColors[type] : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}
                >
                  {t(`calendar.taskTypes.${type}`)}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Task list */}
      {filtered.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500">
            {tasks.length === 0 ? t("calendar.noTasks") : t("common.noResults")}
          </p>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((task) => {
            const plant = task.plantId ? plantMap.get(task.plantId) : undefined;
            const overdue = isOverdue(task);
            const thisWeek = isThisWeek(task);
            return (
              <div
                key={task.id}
                className={`flex items-center gap-3 rounded-lg border bg-white p-3 transition-colors dark:bg-gray-900 ${
                  task.completedDate
                    ? "border-gray-100 opacity-50 dark:border-gray-800"
                    : overdue
                      ? "border-red-200 dark:border-red-900"
                      : thisWeek
                        ? "border-blue-200 dark:border-blue-900"
                        : "border-gray-200 dark:border-gray-700"
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

                {plant && <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={16} />}

                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${task.completedDate ? "line-through text-gray-400" : ""}`}>{task.title}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className={overdue ? "font-medium text-red-500" : ""}>{task.dueDate}</span>
                    {overdue && <span className="text-red-500">{t("calendar.overdue")}</span>}
                  </div>
                </div>

                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs ${taskTypeColors[task.type]}`}>
                  {t(`calendar.taskTypes.${task.type}`)}
                </span>

                <button
                  onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteTask(task.id); }}
                  className="shrink-0 rounded p-1 text-gray-300 hover:text-red-500"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Clear completed */}
      {counts.completed > 0 && viewFilter !== "completed" && (
        <div className="mt-3 text-right">
          <button onClick={handleDeleteCompleted} className="text-xs text-gray-400 hover:text-red-500">
            {t("calendar.deleteCompleted")} ({counts.completed})
          </button>
        </div>
      )}

      <Modal open={showAddTask} onClose={() => setShowAddTask(false)} title={t("calendar.addTask")}>
        <div className="space-y-4">
          <Input label={t("calendar.taskTitle")} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("calendar.taskType")}</label>
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
          <Input label={t("calendar.taskDate")} type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddTask(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAddTask}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
