import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, CalendarDays, Download, Trash2, Pencil, CircleCheck, ListChecks, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { parseISO, startOfDay } from "date-fns";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlantMap, usePlants } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { PlantCombobox } from "@/components/records/PlantCombobox";
import { useOpenAddOnNavigate, type AddPrefill } from "@/hooks/useOpenAddOnNavigate";
import { useOpenFromParam } from "@/hooks/useOpenFromParam";
import { toISODate, todayISO } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { DateField } from "@/components/ui/DateField";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Menu } from "@/components/ui/Menu";
import { List } from "@/components/ui/List";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast, useConfirmDelete } from "@/components/ui/Toast";
import type { Task, TaskType } from "@/types/task";
import { getFrostProtectionWeeks } from "@/types/garden";
import { downloadIcal } from "@/lib/ical";
import { getPlantingTaskDates } from "@/lib/advisor";
import { groupTasksByDue, type TaskGroup } from "@/lib/tasks";
import { useTaskActions } from "@/hooks/useTaskActions";
import { TaskRow } from "./TaskRow";

const TASK_TYPES: TaskType[] = ["sow_indoors", "sow_outdoors", "transplant", "water", "harvest", "fertilize", "scout", "preserve", "soil_test", "custom"];

type StatusFilter = "open" | "done" | "all";
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

export function TaskCalendar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast, confirm } = useToast();
  const confirmDelete = useConfirmDelete();
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

  // Deep link from the command palette: #/tasks?task=<id> opens the edit dialog.
  useOpenFromParam("task", (id) => {
    const task = tasks.find((x) => x.id === id);
    if (!task) return false;
    openEdit(task);
  });

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
    const visible = typed.filter((x) => status === "all" || (status === "open" ? !x.completedDate : !!x.completedDate));
    return groupTasksByDue(visible, startOfDay(parseISO(todayKey)));
  }, [typed, status, todayKey]);

  const hasPlantedBeds = gardens.some((g) => g.beds.some((b) => b.cells.length > 0));

  const handleGenerateTasks = () => {
    let count = 0;
    const frostDate = parseISO(lastFrostDate);
    for (const garden of gardens) {
      const plantings: Array<{ plantId: string; bedId: string; type: TaskType; title: string; dueDate: string }> = [];
      for (const bed of garden.beds) {
        // Same windows as the bed's palette "Jetzt" (lib/advisor), incl. autumn sowing and planting.
        const context = { environmentType: bed.environmentType ?? "outdoor_bed", frostProtectionWeeks: getFrostProtectionWeeks(bed) };
        for (const plantId of new Set(bed.cells.map((c) => c.plantId))) {
          const plant = plantMap.get(plantId);
          if (!plant) continue;
          const name = getPlantName(plantId);
          for (const { type, action, date } of getPlantingTaskDates(plant, frostDate, context)) {
            const label = action === type ? t(`calendar.taskTypes.${type}`) : t(`advisor.actions.${action}`);
            plantings.push({ plantId, bedId: bed.id, type, title: t("calendar.generatedTitle", { action: label, plant: name }), dueDate: toISODate(date) });
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

  const { complete: handleComplete, reopen } = useTaskActions();

  const restore = (task: Task) => {
    const { id: _id, ...rest } = task;
    addTask(rest);
  };

  const handleDelete = async (task: Task) => {
    if (!(await confirmDelete("task", task.title))) return;
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

  const groupLabel = (g: TaskGroup, n: number) => `${t(`calendar.groups.${g}`)} · ${n}`;

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
        // While the empty state shows, it carries both actions; the header stays quiet.
        actions={tasks.length === 0 ? undefined : (
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
        )}
      />

      {tasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={ListChecks}
            title={t("calendar.emptyTitle")}
            description={t("calendar.emptyText")}
            action={<Button onClick={() => openAdd()}><Plus size={16} aria-hidden="true" />{t("calendar.addTask")}</Button>}
            // The text promises dates from the bed plan: with planted beds generate them, else go plant some.
            secondaryAction={hasPlantedBeds ? (
              <Button variant="secondary" onClick={handleGenerateTasks}><CalendarDays size={16} aria-hidden="true" />{t("calendar.generate")}</Button>
            ) : (
              <Button variant="secondary" onClick={() => navigate("/planner")}><LayoutGrid size={16} aria-hidden="true" />{t("importPage.toPlanner")}</Button>
            )}
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
                <List key={group} headingLevel={2} header={<span className={group === "overdue" ? "text-danger" : undefined}>{groupLabel(group, list.length)}</span>}>
                  {list.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      group={group}
                      plant={task.plantId ? plantMap.get(task.plantId) : undefined}
                      bedName={task.bedId ? bedNames.get(task.bedId) : undefined}
                      onComplete={handleComplete}
                      onReopen={reopen}
                      onOpen={openEdit}
                      actions={
                        <Menu
                          label={t("common.moreActions")}
                          items={[
                            { label: t("common.edit"), icon: Pencil, onSelect: () => openEdit(task) },
                            "separator",
                            { label: t("common.delete"), icon: Trash2, danger: true, onSelect: () => void handleDelete(task) },
                          ]}
                        />
                      }
                    />
                  ))}
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
            <Button onClick={handleSave} disabled={!draft.title.trim() || !draft.dueDate}>{t("common.save")}</Button>
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
          <Select
            label={t("calendar.taskType")}
            value={draft.type}
            onChange={(e) => patch({ type: e.target.value as TaskType })}
            options={TASK_TYPES.map((type) => ({ value: type, label: t(`calendar.taskTypes.${type}`) }))}
          />
          {/* Tasks lie ahead: Heute / Morgen / In 1 Woche, like the record dialogs' Heute / Gestern. */}
          <DateField mode="future" label={t("calendar.taskDate")} value={draft.dueDate} onChange={(dueDate) => patch({ dueDate })} />
          {gardens.length > 1 && (
            <Select
              label={t("calendar.garden")}
              value={draft.gardenId}
              onChange={(e) => patch({ gardenId: e.target.value, bedId: "" })}
              options={gardens.map((g) => ({ value: g.id, label: g.name }))}
            />
          )}
          {/* Bed and plant share one row; the plant takes the full width when there is no bed to pick. */}
          <div className={bedOptions.length > 0 ? "grid gap-4 sm:grid-cols-2" : undefined}>
            {bedOptions.length > 0 && (
              <Select
                label={t("harvest.bed")}
                optional
                value={draft.bedId}
                onChange={(e) => patch({ bedId: e.target.value })}
                placeholder={t("harvest.noBed")}
                options={bedOptions}
              />
            )}
            {/* The searchable plant field of every other dialog, not a 47-entry select. */}
            <PlantCombobox
              label={t("harvest.plant")}
              plants={plants}
              optional
              value={draft.plantId}
              onChange={({ plantId }) => patch({ plantId })}
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
          <Textarea label={t("harvest.notes")} optional placeholder={t("common.notesPlaceholder")} value={draft.description} onChange={(e) => patch({ description: e.target.value })} rows={2} />
        </div>
      </Modal>
    </div>
  );
}
