import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import {
  Plus, CalendarDays, Download, Trash2, Pencil, Repeat, CircleCheck, RotateCcw, ListChecks,
  House, Sprout, Shovel, Droplets, Apple, Leaf, Search, CookingPot, TestTube, ClipboardList,
} from "lucide-react";
import { addDays, addWeeks, differenceInCalendarDays, endOfWeek, parseISO, startOfDay } from "date-fns";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { useOpenAddOnNavigate, type AddPrefill } from "@/hooks/useOpenAddOnNavigate";
import { toISODate, todayISO } from "@/lib/format";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { Menu } from "@/components/ui/Menu";
import { List, ListRow } from "@/components/ui/List";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import type { Task, TaskType } from "@/types/task";
import { getFrostProtectionWeeks } from "@/types/garden";
import { downloadIcal } from "@/lib/ical";

const TASK_TYPES: TaskType[] = ["sow_indoors", "sow_outdoors", "transplant", "water", "harvest", "fertilize", "scout", "preserve", "soil_test", "custom"];

export const TASK_TYPE_ICONS: Record<TaskType, LucideIcon> = {
  sow_indoors: House,
  sow_outdoors: Sprout,
  transplant: Shovel,
  water: Droplets,
  harvest: Apple,
  fertilize: Leaf,
  scout: Search,
  preserve: CookingPot,
  soil_test: TestTube,
  custom: ClipboardList,
};

type StatusFilter = "open" | "done" | "all";
type Group = "overdue" | "today" | "tomorrow" | "thisWeek" | "later" | "done";
const GROUP_ORDER: Group[] = ["overdue", "today", "tomorrow", "thisWeek", "later", "done"];
type Recurrence = "none" | "daily" | "weekly" | "biweekly";

interface Draft {
  title: string;
  type: TaskType;
  dueDate: string;
  gardenId: string;
  bedId: string;
  plantId: string;
  recurring: Recurrence;
  description: string;
}

function groupOf(task: Task, today: Date, weekEnd: Date): Group {
  if (task.completedDate) return "done";
  const diff = differenceInCalendarDays(parseISO(task.dueDate), today);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (parseISO(task.dueDate) <= weekEnd) return "thisWeek";
  return "later";
}

function nextDue(task: Task): string | null {
  if (!task.recurring) return null;
  const due = parseISO(task.dueDate);
  const step = task.recurring.interval === "daily" ? addDays(due, 1) : addWeeks(due, task.recurring.interval === "weekly" ? 1 : 2);
  // Never schedule into the past: a daily task done late continues from today.
  const today = startOfDay(new Date());
  const next = step < today ? addDays(today, task.recurring.interval === "daily" ? 1 : 0) : step;
  if (task.recurring.until && next > parseISO(task.recurring.until)) return null;
  return toISODate(next);
}

export function TaskCalendar() {
  const { t } = useTranslation();
  const { toast, confirm } = useToast();
  const { formatDate } = useFormat();
  const { tasks, gardens, lastFrostDate, addTask, updateTask, deleteTask, generateTasks } = useStore(
    useShallow((s) => ({
      tasks: s.tasks, gardens: s.gardens, lastFrostDate: s.lastFrostDate,
      addTask: s.addTask, updateTask: s.updateTask, deleteTask: s.deleteTask, generateTasks: s.generateTasks,
    }))
  );
  const plants = usePlants();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();

  const [status, setStatus] = useState<StatusFilter>("open");
  const [typeFilter, setTypeFilter] = useState<"all" | TaskType>("all");

  const emptyDraft = useCallback((prefill?: AddPrefill): Draft => {
    const gardenId = prefill?.gardenId ?? gardens.find((g) => g.beds.some((b) => b.id === prefill?.bedId))?.id ?? gardens[0]?.id ?? "";
    return {
      title: "", type: "custom", dueDate: todayISO(), gardenId,
      bedId: prefill?.bedId ?? "", plantId: prefill?.plantId ?? "", recurring: "none", description: "",
    };
  }, [gardens]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const openAdd = useCallback((prefill?: AddPrefill) => {
    setEditingId(null);
    setDraft(emptyDraft(prefill));
    setDialogOpen(true);
  }, [emptyDraft]);
  useOpenAddOnNavigate(openAdd);

  const openEdit = (task: Task) => {
    setEditingId(task.id);
    setDraft({
      title: task.title, type: task.type, dueDate: task.dueDate.slice(0, 10), gardenId: task.gardenId,
      bedId: task.bedId ?? "", plantId: task.plantId ?? "", recurring: task.recurring?.interval ?? "none",
      description: task.description ?? "",
    });
    setDialogOpen(true);
  };

  // Bed names (prefixed with the garden when there are several gardens).
  const bedNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of gardens) for (const b of g.beds) map.set(b.id, gardens.length > 1 ? `${g.name} · ${b.name}` : b.name);
    return map;
  }, [gardens]);

  const todayKey = todayISO();

  const typed = useMemo(
    () => (typeFilter === "all" ? tasks : tasks.filter((x) => x.type === typeFilter)),
    [tasks, typeFilter],
  );
  const openCount = typed.filter((x) => !x.completedDate).length;
  const doneCount = typed.length - openCount;
  const overdueCount = tasks.filter((x) => !x.completedDate && x.dueDate.slice(0, 10) < todayKey).length;
  const totalOpen = tasks.filter((x) => !x.completedDate).length;

  const groups = useMemo(() => {
    const today = startOfDay(parseISO(todayKey));
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const visible = typed.filter((x) => status === "all" || (status === "open" ? !x.completedDate : !!x.completedDate));
    const byGroup = new Map<Group, Task[]>();
    for (const task of visible) {
      const g = groupOf(task, today, weekEnd);
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(task);
    }
    for (const [g, list] of byGroup) {
      list.sort((a, b) => g === "done"
        ? (b.completedDate ?? "").localeCompare(a.completedDate ?? "")
        : a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title));
    }
    return GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({ group: g, tasks: byGroup.get(g)! }));
  }, [typed, status, todayKey]);

  const hasPlantedBeds = gardens.some((g) => g.beds.some((b) => b.cells.length > 0));

  const handleGenerateTasks = () => {
    let count = 0;
    const frostDate = parseISO(lastFrostDate);
    for (const garden of gardens) {
      const plantings: Array<{ plantId: string; bedId: string; type: TaskType; title: string; dueDate: string }> = [];
      for (const bed of garden.beds) {
        const effectiveFrostDate = addWeeks(frostDate, -getFrostProtectionWeeks(bed));
        for (const plantId of new Set(bed.cells.map((c) => c.plantId))) {
          const plant = plantMap.get(plantId);
          if (!plant) continue;
          const name = getPlantName(plantId);
          const add = (type: TaskType, weeks: number | null) => {
            if (weeks === null) return;
            plantings.push({ plantId, bedId: bed.id, type, title: t("calendar.generatedTitle", { action: t(`calendar.taskTypes.${type}`), plant: name }), dueDate: toISODate(addWeeks(effectiveFrostDate, weeks)) });
          };
          add("sow_indoors", plant.sowIndoorsWeeks);
          add("sow_outdoors", plant.sowOutdoorsWeeks);
          add("transplant", plant.transplantWeeks);
        }
      }
      if (plantings.length > 0) {
        count += plantings.length;
        generateTasks(garden.id, plantings);
      }
    }
    toast(t("calendar.generated", { count }), "success");
  };

  const handleSave = () => {
    if (!draft.title.trim() || !draft.dueDate) return;
    const fields = {
      title: draft.title.trim(),
      type: draft.type,
      dueDate: draft.dueDate,
      gardenId: draft.gardenId || gardens[0]?.id || "",
      bedId: draft.bedId || undefined,
      plantId: draft.plantId || undefined,
      description: draft.description.trim() || undefined,
      recurring: draft.recurring === "none" ? undefined : { interval: draft.recurring },
    };
    if (editingId) {
      updateTask(editingId, fields);
      toast(t("calendar.taskUpdated"), "success");
    } else {
      addTask(fields);
      toast(t("calendar.taskAdded"), "success");
    }
    setDialogOpen(false);
  };

  const handleComplete = (task: Task) => {
    const next = nextDue(task);
    if (next) {
      // Recurring: roll forward to the next date instead of closing the task.
      updateTask(task.id, { dueDate: next });
      toast(t("calendar.nextOccurrence", { date: formatDate(next, "relative") }), "success", {
        action: { label: t("common.undo"), onClick: () => updateTask(task.id, { dueDate: task.dueDate }) },
      });
      return;
    }
    updateTask(task.id, { completedDate: todayISO() });
    toast(t("calendar.taskDone"), "success", {
      action: { label: t("common.undo"), onClick: () => updateTask(task.id, { completedDate: undefined }) },
    });
  };

  const restore = (task: Task) => {
    const { id: _id, ...rest } = task;
    addTask(rest);
  };

  const handleDelete = async (task: Task) => {
    if (!(await confirm(t("common.confirmDelete"), { confirmLabel: t("common.delete") }))) return;
    deleteTask(task.id);
    setDialogOpen(false);
    toast(t("calendar.taskDeleted"), "success", { action: { label: t("common.undo"), onClick: () => restore(task) } });
  };

  const handleDeleteCompleted = async () => {
    const completed = tasks.filter((x) => x.completedDate);
    if (completed.length === 0) return;
    if (!(await confirm(t("calendar.deleteCompletedConfirm", { count: completed.length }), { confirmLabel: t("common.delete") }))) return;
    for (const task of completed) deleteTask(task.id);
    toast(t("calendar.deletedCompleted", { count: completed.length }), "success", {
      action: { label: t("common.undo"), onClick: () => completed.forEach(restore) },
    });
  };

  const editing = editingId ? tasks.find((x) => x.id === editingId) : undefined;

  const groupLabel = (g: Group, n: number) => `${t(`calendar.groups.${g}`)} · ${n}`;

  const bedOptions = useMemo(() => {
    const garden = gardens.find((g) => g.id === draft.gardenId) ?? gardens[0];
    return (garden?.beds ?? []).map((b) => ({ value: b.id, label: b.name }));
  }, [gardens, draft.gardenId]);

  const description = tasks.length === 0
    ? t("calendar.subtitle")
    : [t("calendar.openCount", { count: totalOpen }), overdueCount > 0 ? t("calendar.overdueCount", { count: overdueCount }) : null].filter(Boolean).join(" · ");

  return (
    <div>
      <PageHeader
        title={t("nav.tasks")}
        description={description}
        actions={
          <>
            {hasPlantedBeds && (
              <span className="hidden sm:contents">
                <Button variant="secondary" onClick={handleGenerateTasks} title={t("calendar.generateHint")}>
                <CalendarDays size={16} aria-hidden="true" />
                {t("calendar.generate")}
              </Button>
              </span>
            )}
            <Button onClick={() => openAdd()}>
              <Plus size={16} aria-hidden="true" />
              {t("calendar.addTask")}
            </Button>
            {(tasks.length > 0 || hasPlantedBeds) && (
              <Menu
                label={t("common.moreActions")}
                items={[
                  ...(hasPlantedBeds ? [{ label: t("calendar.generate"), icon: CalendarDays, onSelect: handleGenerateTasks }] : []),
                  ...(tasks.length > 0 ? [{ label: t("calendar.exportIcal"), icon: Download, onSelect: () => downloadIcal(tasks) }] : []),
                  ...(tasks.some((x) => x.completedDate)
                    ? ["separator" as const, { label: t("calendar.deleteCompleted"), icon: Trash2, danger: true, onSelect: () => void handleDeleteCompleted() }]
                    : []),
                ]}
              />
            )}
          </>
        }
      />

      {tasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={ListChecks}
            title={t("calendar.emptyTitle")}
            description={t("calendar.emptyText")}
            action={<Button onClick={() => openAdd()}><Plus size={16} aria-hidden="true" />{t("calendar.addTask")}</Button>}
            secondaryAction={hasPlantedBeds ? (
              <Button variant="secondary" onClick={handleGenerateTasks}><CalendarDays size={16} aria-hidden="true" />{t("calendar.generate")}</Button>
            ) : undefined}
          />
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <SegmentedControl
              label={t("calendar.statusFilter")}
              value={status}
              onChange={setStatus}
              options={[
                { value: "open", label: t("calendar.open"), count: openCount },
                { value: "done", label: t("calendar.completed"), count: doneCount },
                { value: "all", label: t("common.all"), count: typed.length },
              ]}
            />
            <Select
              aria-label={t("calendar.typeFilter")}
              wrapperClassName="w-full sm:w-52"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | TaskType)}
              options={[{ value: "all", label: t("calendar.allTypes") }, ...TASK_TYPES.map((type) => ({ value: type, label: t(`calendar.taskTypes.${type}`) }))]}
            />
          </div>

          {groups.length === 0 ? (
            <Card>
              <EmptyState
                compact
                icon={CircleCheck}
                title={status === "open" ? t("calendar.allDoneTitle") : t("calendar.emptyFilter")}
                description={status === "open" ? t("calendar.allDoneText") : t("calendar.emptyFilterText")}
                action={<Button variant="secondary" onClick={() => openAdd()}><Plus size={16} aria-hidden="true" />{t("calendar.addTask")}</Button>}
              />
            </Card>
          ) : (
            <div className="space-y-4">
              {groups.map(({ group, tasks: list }) => (
                <List key={group} header={<span className={group === "overdue" ? "text-danger" : undefined}>{groupLabel(group, list.length)}</span>}>
                  {list.map((task) => {
                    const plant = task.plantId ? plantMap.get(task.plantId) : undefined;
                    const TypeIcon = TASK_TYPE_ICONS[task.type] ?? ClipboardList;
                    const done = !!task.completedDate;
                    const due = task.dueDate.slice(0, 10);
                    const meta = [
                      task.type === "custom" ? null : t(`calendar.taskTypes.${task.type}`),
                      task.bedId ? bedNames.get(task.bedId) : null,
                      plant && !task.title.includes(getPlantName(plant.id)) ? getPlantName(plant.id) : null,
                      done
                        ? t("calendar.doneOn", { date: formatDate(task.completedDate!, "relative") })
                        : group === "overdue" ? null : formatDate(due, group === "later" ? "short" : "relative"),
                    ].filter(Boolean).join(" · ");
                    return (
                      <ListRow
                        key={task.id}
                        muted={done}
                        onClick={() => openEdit(task)}
                        leading={
                          plant ? (
                            <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={28} />
                          ) : (
                            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300" aria-hidden="true">
                              <TypeIcon size={16} />
                            </span>
                          )
                        }
                        title={<span className={done ? "line-through" : undefined}>{task.title}</span>}
                        clickLabel={task.title}
                        badges={
                          <>
                            {group === "overdue" && (
                              <Badge tone="danger" dot>{t("calendar.overdueSince", { date: formatDate(due, "relative") })}</Badge>
                            )}
                            {task.recurring && (
                              <Badge icon={Repeat} title={t("calendar.recurrence")}>{t(`calendar.recurring.${task.recurring.interval}`)}</Badge>
                            )}
                          </>
                        }
                        meta={meta}
                        description={task.description}
                        actions={
                          <>
                            {done ? (
                              <IconButton icon={RotateCcw} label={t("calendar.reopen")} onClick={() => updateTask(task.id, { completedDate: undefined })} />
                            ) : (
                              <IconButton icon={CircleCheck} tone="brand" label={t("calendar.markDone")} onClick={() => handleComplete(task)} />
                            )}
                            <Menu
                              label={t("common.moreActions")}
                              items={[
                                { label: t("common.edit"), icon: Pencil, onSelect: () => openEdit(task) },
                                "separator",
                                { label: t("common.delete"), icon: Trash2, danger: true, onSelect: () => void handleDelete(task) },
                              ]}
                            />
                          </>
                        }
                      />
                    );
                  })}
                </List>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add and edit share one dialog */}
      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingId ? t("calendar.editTask") : t("calendar.addTask")}
        footer={
          <>
            {editing && (
              <Button variant="danger-ghost" className="mr-auto" onClick={() => void handleDelete(editing)}>
                <Trash2 size={16} aria-hidden="true" />
                {t("common.delete")}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={!draft.title.trim() || !draft.dueDate}>{editingId ? t("common.save") : t("common.add")}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t("calendar.taskTitle")}
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            placeholder={t("calendar.titlePlaceholder")}
            autoFocus
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={t("calendar.taskType")}
              value={draft.type}
              onChange={(e) => patch({ type: e.target.value as TaskType })}
              options={TASK_TYPES.map((type) => ({ value: type, label: t(`calendar.taskTypes.${type}`) }))}
            />
            <Input label={t("calendar.taskDate")} type="date" value={draft.dueDate} onChange={(e) => patch({ dueDate: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {gardens.length > 1 && (
              <Select
                label={t("calendar.garden")}
                value={draft.gardenId}
                onChange={(e) => patch({ gardenId: e.target.value, bedId: "" })}
                options={gardens.map((g) => ({ value: g.id, label: g.name }))}
              />
            )}
            {bedOptions.length > 0 && (
              <Select
                label={t("harvest.bed")}
                value={draft.bedId}
                onChange={(e) => patch({ bedId: e.target.value })}
                placeholder="–"
                options={bedOptions}
              />
            )}
            <Select
              label={t("harvest.plant")}
              value={draft.plantId}
              onChange={(e) => patch({ plantId: e.target.value })}
              placeholder="–"
              options={plants.map((p) => ({ value: p.id, label: getPlantName(p.id) }))}
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{t("calendar.recurrence")}</p>
            <SegmentedControl
              fullWidth
              label={t("calendar.recurrence")}
              value={draft.recurring}
              onChange={(recurring) => patch({ recurring })}
              options={(["none", "daily", "weekly", "biweekly"] as const).map((r) => ({ value: r, label: t(`calendar.recurring.${r}`) }))}
            />
          </div>
          <Textarea label={t("calendar.description")} value={draft.description} onChange={(e) => patch({ description: e.target.value })} rows={2} />
        </div>
      </Modal>
    </div>
  );
}
