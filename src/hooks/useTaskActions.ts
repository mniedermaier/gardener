import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { useFormat } from "@/hooks/useFormat";
import { useToast } from "@/components/ui/Toast";
import { nextDue } from "@/lib/tasks";
import { todayISO } from "@/lib/format";
import type { Task } from "@/types/task";

/** Relative date in mid-sentence: "morgen", not "Morgen". */
const inline = (s: string) => (/^\p{L}/u.test(s) ? s.charAt(0).toLocaleLowerCase() + s.slice(1) : s);

/**
 * Checking a task off, the same everywhere (dashboard and task page):
 * recurring tasks roll forward to their next date, others are closed;
 * both with an undo toast.
 */
export function useTaskActions() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { formatDate } = useFormat();
  const updateTask = useStore(useShallow((s) => s.updateTask));

  const complete = useCallback((task: Task) => {
    const next = nextDue(task);
    if (next) {
      updateTask(task.id, { dueDate: next });
      toast(t("calendar.nextOccurrence", { title: task.title, date: inline(formatDate(next, "relative")) }), "success", {
        action: { label: t("common.undo"), onClick: () => updateTask(task.id, { dueDate: task.dueDate }) },
      });
      return;
    }
    updateTask(task.id, { completedDate: todayISO() });
    toast(t("dashboard.taskDone", { title: task.title }), "success", {
      action: { label: t("common.undo"), onClick: () => updateTask(task.id, { completedDate: undefined }) },
    });
  }, [updateTask, toast, t, formatDate]);

  const reopen = useCallback((task: Task) => updateTask(task.id, { completedDate: undefined }), [updateTask]);

  return { complete, reopen };
}
