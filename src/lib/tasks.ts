import { addDays, addWeeks, differenceInCalendarDays, startOfDay } from "date-fns";
import type { Task } from "@/types/task";
import { toDate, toISODate } from "@/lib/format";

/**
 * Due-date groups, shared by the dashboard ("Heute") and the task page so a
 * task is always filed under the same name: a rolling seven-day window, not
 * the calendar week (a task on Monday next week is "Nächste 7 Tage" on both).
 */
export type TaskGroup = "overdue" | "today" | "tomorrow" | "next7" | "later" | "done";
export const TASK_GROUP_ORDER: TaskGroup[] = ["overdue", "today", "tomorrow", "next7", "later", "done"];

export function taskGroup(task: Task, today: Date): TaskGroup {
  if (task.completedDate) return "done";
  const due = toDate(task.dueDate.slice(0, 10));
  if (!due) return "later";
  const diff = differenceInCalendarDays(due, startOfDay(today));
  // A daily task is simply today's again: missing yesterday's watering does
  // not make it "4 Tage überfällig" (it would inflate the overdue count).
  if (diff < 0) return task.recurring?.interval === "daily" ? "today" : "overdue";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff <= 7) return "next7";
  return "later";
}

/** Groups in display order; open tasks by due date, done tasks newest first. */
export function groupTasksByDue(tasks: Task[], today: Date): Array<{ group: TaskGroup; tasks: Task[] }> {
  const byGroup = new Map<TaskGroup, Task[]>();
  for (const task of tasks) {
    const g = taskGroup(task, today);
    const list = byGroup.get(g) ?? [];
    list.push(task);
    byGroup.set(g, list);
  }
  for (const [g, list] of byGroup) {
    list.sort((a, b) => g === "done"
      ? (b.completedDate ?? "").localeCompare(a.completedDate ?? "")
      : a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title));
  }
  return TASK_GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({ group: g, tasks: byGroup.get(g)! }));
}

/** Next due date of a recurring task after completing it, or null when it ends. */
export function nextDue(task: Task, today: Date = new Date()): string | null {
  if (!task.recurring) return null;
  const due = toDate(task.dueDate.slice(0, 10));
  if (!due) return null;
  const step = task.recurring.interval === "daily" ? addDays(due, 1) : addWeeks(due, task.recurring.interval === "weekly" ? 1 : 2);
  // Never schedule into the past: a daily task done late continues from today.
  const start = startOfDay(today);
  const next = step < start ? addDays(start, task.recurring.interval === "daily" ? 1 : 0) : step;
  const until = task.recurring.until ? toDate(task.recurring.until) : null;
  if (until && next > until) return null;
  return toISODate(next);
}
