import { memo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Check, ClipboardList, Repeat } from "lucide-react";
import type { Task } from "@/types/task";
import type { Plant } from "@/types/plant";
import type { TaskGroup } from "@/lib/tasks";
import { useFormat } from "@/hooks/useFormat";
import { usePlantName } from "@/hooks/usePlantName";
import { ListRow } from "@/components/ui/List";
import { Badge } from "@/components/ui/Badge";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { TASK_TYPE_ICONS } from "./taskTypeIcons";

interface Props {
  task: Task;
  group: TaskGroup;
  plant?: Plant;
  bedName?: string;
  onComplete: (task: Task) => void;
  onReopen?: (task: Task) => void;
  /** Whole row → edit dialog (task page) or deep link (dashboard). */
  onOpen?: (task: Task) => void;
  /** Row menu (task page). */
  actions?: ReactNode;
}

/**
 * One task row for the dashboard and the task page: round checkbox on the
 * left (tap to complete, tap again to reopen), title with overdue/recurring
 * badges, "Typ · Beet · Pflanze · Datum" meta, plant or type icon on the right.
 */
export const TaskRow = memo(function TaskRow({ task, group, plant, bedName, onComplete, onReopen, onOpen, actions }: Props) {
  const { t } = useTranslation();
  const { formatDate } = useFormat();
  const getPlantName = usePlantName();
  const done = !!task.completedDate;
  const due = task.dueDate.slice(0, 10);
  const TypeIcon = TASK_TYPE_ICONS[task.type] ?? ClipboardList;
  const plantName = plant ? getPlantName(plant.id) : null;

  const meta = [
    task.type === "custom" ? null : t(`calendar.taskTypes.${task.type}`),
    bedName ?? null,
    plantName && !task.title.includes(plantName) ? plantName : null,
    done
      ? t("calendar.doneOn", { date: formatDate(task.completedDate!.slice(0, 10), "relative") })
      : group === "overdue" || group === "today" ? null : formatDate(due, group === "later" ? "short" : "relative"),
  ].filter(Boolean).join(" · ");

  return (
    <ListRow
      muted={done}
      onClick={onOpen ? () => onOpen(task) : undefined}
      clickLabel={task.title}
      leading={
        <button
          type="button"
          onClick={() => (done ? onReopen?.(task) : onComplete(task))}
          disabled={done && !onReopen}
          aria-label={done ? t("calendar.reopenNamed", { title: task.title }) : t("dashboard.markDone", { title: task.title })}
          aria-pressed={done}
          className="group/check relative z-10 -m-1.5 inline-flex size-11 items-center justify-center rounded-full"
        >
          <span
            className={
              done
                ? "inline-flex size-6 items-center justify-center rounded-full bg-garden-600 text-white dark:bg-garden-400 dark:text-gray-950"
                : "inline-flex size-6 items-center justify-center rounded-full border-2 border-gray-400 text-transparent transition-colors group-hover/check:border-garden-600 group-hover/check:text-garden-600 dark:border-white/30 dark:group-hover/check:border-garden-400 dark:group-hover/check:text-garden-300"
            }
          >
            <Check size={14} strokeWidth={3} aria-hidden="true" />
          </span>
        </button>
      }
      title={<span className={done ? "line-through" : undefined}>{task.title}</span>}
      badges={
        <>
          {group === "overdue" && <Badge tone="danger" dot>{t("calendar.overdueSince", { date: formatDate(due, "relative") })}</Badge>}
          {task.recurring && <Badge icon={Repeat} title={t("calendar.recurrence")}>{t(`calendar.recurring.${task.recurring.interval}`)}</Badge>}
        </>
      }
      meta={meta || undefined}
      description={task.description}
      trailing={
        plant ? (
          <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={24} />
        ) : (
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300" aria-hidden="true">
            <TypeIcon size={15} />
          </span>
        )
      }
      actions={actions}
    />
  );
});
