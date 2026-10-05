import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Check, ArrowRight, ClipboardCheck, Plus, Repeat } from "lucide-react";
import { addDays, isBefore, isSameDay } from "date-fns";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { useFormat } from "@/hooks/useFormat";
import { usePlantMap } from "@/hooks/usePlants";
import { toDate } from "@/lib/format";
import type { Task } from "@/types/task";
import { Card } from "@/components/ui/Card";
import { List, ListRow } from "@/components/ui/List";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { useToast } from "@/components/ui/Toast";
import type { OpenAddState } from "@/hooks/useOpenAddOnNavigate";

const MAX_ROWS = 7;

/**
 * "Heute & überfällig": open tasks up to the end of the coming week,
 * checkable right here with an undo toast.
 */
export const TodayTasks = memo(function TodayTasks({ now, hideWhenEmpty = false }: { now: Date; hideWhenEmpty?: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatDate } = useFormat();
  const plantMap = usePlantMap();
  const { tasks, gardens, completeTask, updateTask } = useStore(
    useShallow((s) => ({ tasks: s.tasks, gardens: s.gardens, completeTask: s.completeTask, updateTask: s.updateTask })),
  );

  const bedNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of gardens) for (const b of g.beds) map.set(b.id, b.name);
    return map;
  }, [gardens]);

  const { overdue, today, soon } = useMemo(() => {
    const horizon = addDays(now, 7);
    const open = tasks
      .filter((task) => !task.completedDate)
      .map((task) => ({ task, due: toDate(task.dueDate) }))
      .filter((x): x is { task: Task; due: Date } => x.due !== null && isBefore(x.due, horizon))
      .sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate));
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return {
      overdue: open.filter((x) => isBefore(x.due, startOfToday)).map((x) => x.task),
      today: open.filter((x) => isSameDay(x.due, now)).map((x) => x.task),
      soon: open.filter((x) => !isBefore(x.due, startOfToday) && !isSameDay(x.due, now)).map((x) => x.task),
    };
  }, [tasks, now]);

  const complete = (task: Task) => {
    completeTask(task.id);
    toast(t("dashboard.taskDone", { title: task.title }), "success", {
      action: { label: t("common.undo"), onClick: () => updateTask(task.id, { completedDate: undefined }) },
    });
  };

  const total = overdue.length + today.length + soon.length;
  // At most MAX_ROWS rows, filled in order: overdue, today, the coming week.
  const shownOverdue = overdue.slice(0, MAX_ROWS);
  const shownToday = today.slice(0, MAX_ROWS - shownOverdue.length);
  const shownSoon = soon.slice(0, MAX_ROWS - shownOverdue.length - shownToday.length);
  const groups = [
    { key: "overdue", label: t("dashboard.groupOverdue"), items: shownOverdue },
    { key: "today", label: t("dashboard.groupToday"), items: shownToday },
    { key: "soon", label: t("dashboard.groupSoon"), items: shownSoon },
  ].filter((g) => g.items.length > 0);
  const hidden = total - shownOverdue.length - shownToday.length - shownSoon.length;

  const header = (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">{t("dashboard.todayTitle")}</h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {total === 0
            ? t("dashboard.todayClear")
            : overdue.length > 0
              ? t("dashboard.overdueCount", { count: overdue.length })
              : t("dashboard.openCount", { count: total })}
        </p>
      </div>
      <Link to="/tasks" className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-medium text-garden-700 hover:underline sm:min-h-0 dark:text-garden-300">
        {t("dashboard.allTasks")} <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );

  if (total === 0 && hideWhenEmpty) return null;
  if (total === 0) {
    return (
      <section>
        {header}
        <Card padding="sm">
          <EmptyState
            compact
            icon={ClipboardCheck}
            title={t("dashboard.noTasksTitle")}
            description={t("dashboard.noTasksText")}
            action={
              <Button variant="secondary" size="sm" onClick={() => navigate("/tasks", { state: { openAdd: true } satisfies OpenAddState })}>
                <Plus size={14} aria-hidden="true" />
                {t("quickAdd.task")}
              </Button>
            }
          />
        </Card>
      </section>
    );
  }

  return (
    <section>
      {header}
      <div className="space-y-3">
        {groups.map((group) => (
          <List key={group.key} header={group.label}>
            {group.items.map((task) => {
              const plant = task.plantId ? plantMap.get(task.plantId) : undefined;
              const bed = task.bedId ? bedNames.get(task.bedId) : undefined;
              const meta = (
                <>
                  {group.key !== "today" && (
                    <time dateTime={task.dueDate} className={group.key === "overdue" ? "font-medium text-danger" : undefined}>
                      {formatDate(task.dueDate, "relative")}
                    </time>
                  )}
                  {group.key !== "today" && bed && " · "}
                  {bed}
                </>
              );
              return (
                <ListRow
                  key={task.id}
                  leading={
                    <button
                      type="button"
                      onClick={() => complete(task)}
                      aria-label={t("dashboard.markDone", { title: task.title })}
                      className="group/check relative z-10 -m-1.5 inline-flex size-11 items-center justify-center rounded-full"
                    >
                      <span className="inline-flex size-6 items-center justify-center rounded-full border-2 border-gray-300 text-transparent transition-colors group-hover/check:border-garden-600 group-hover/check:text-garden-600 dark:border-white/25 dark:group-hover/check:border-garden-400 dark:group-hover/check:text-garden-300">
                        <Check size={14} strokeWidth={3} aria-hidden="true" />
                      </span>
                    </button>
                  }
                  title={task.title}
                  badges={
                    <>
                      {task.recurring && <Repeat size={14} aria-label={t("dashboard.recurring")} className="text-gray-500 dark:text-gray-400" />}
                    </>
                  }
                  meta={group.key !== "today" || bed ? meta : undefined}
                  trailing={plant ? <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={22} /> : undefined}
                />
              );
            })}
          </List>
        ))}
        {hidden > 0 && (
          <Link to="/tasks" className="block px-1 text-sm font-medium text-garden-700 hover:underline dark:text-garden-300">
            {t("dashboard.moreTasks", { count: hidden })}
          </Link>
        )}
      </div>
    </section>
  );
});
