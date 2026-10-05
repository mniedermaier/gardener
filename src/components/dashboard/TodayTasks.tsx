import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ClipboardCheck, Plus } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlantMap } from "@/hooks/usePlants";
import { useTaskActions } from "@/hooks/useTaskActions";
import { groupTasksByDue, type TaskGroup } from "@/lib/tasks";
import type { Task } from "@/types/task";
import { Card } from "@/components/ui/Card";
import { List } from "@/components/ui/List";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { TaskRow } from "@/components/calendar/TaskRow";
import type { OpenAddState } from "@/hooks/useOpenAddOnNavigate";

const MAX_ROWS = 7;
/** The dashboard shows the near part of the task page's groups, same names. */
const NEAR: TaskGroup[] = ["overdue", "today", "tomorrow", "next7"];

/**
 * "Aufgaben" on the dashboard: overdue, today, tomorrow and the next seven
 * days, shortened. Same rows, grouping and check-off as the task page.
 */
export const TodayTasks = memo(function TodayTasks({ now, hideWhenEmpty = false }: { now: Date; hideWhenEmpty?: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const plantMap = usePlantMap();
  const { complete } = useTaskActions();
  const { tasks, gardens } = useStore(useShallow((s) => ({ tasks: s.tasks, gardens: s.gardens })));

  const bedNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of gardens) for (const b of g.beds) map.set(b.id, gardens.length > 1 ? `${g.name} · ${b.name}` : b.name);
    return map;
  }, [gardens]);

  const near = useMemo(
    () => groupTasksByDue(tasks.filter((x) => !x.completedDate), now).filter((g) => NEAR.includes(g.group)),
    [tasks, now],
  );
  const overdueCount = near.find((g) => g.group === "overdue")?.tasks.length ?? 0;
  const total = near.reduce((s, g) => s + g.tasks.length, 0);

  // At most MAX_ROWS rows, filled in group order.
  const groups = near
    .map((g, i) => {
      const before = near.slice(0, i).reduce((n, x) => n + x.tasks.length, 0);
      return { ...g, items: g.tasks.slice(0, Math.max(0, MAX_ROWS - before)) };
    })
    .filter((g) => g.items.length > 0);
  const hidden = total - groups.reduce((s, g) => s + g.items.length, 0);
  const openTask = (task: Task) => navigate(`/tasks?task=${encodeURIComponent(task.id)}`);

  const header = (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">{t("dashboard.todayTitle")}</h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {total === 0
            ? t("dashboard.todayClear")
            : overdueCount > 0
              ? t("dashboard.overdueCount", { count: overdueCount })
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
        {groups.map(({ group, items }) => (
          <List key={group} header={<span className={group === "overdue" ? "text-danger" : undefined}>{t(`calendar.groups.${group}`)}</span>}>
            {items.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                group={group}
                plant={task.plantId ? plantMap.get(task.plantId) : undefined}
                bedName={task.bedId ? bedNames.get(task.bedId) : undefined}
                onComplete={complete}
                onOpen={openTask}
              />
            ))}
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
