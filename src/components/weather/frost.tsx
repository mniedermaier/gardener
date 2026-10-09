import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, CalendarPlus } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { useFormat } from "@/hooks/useFormat";
import { useToday } from "@/hooks/useToday";
import { toDate, toISODate } from "@/lib/format";
import { summarizeFrost, type FrostSummary } from "@/lib/weatherAlerts";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/** "Heute", "Morgen", then the short weekday ("Mi") — the day names of the forecast list. */
export function useDayLabel(): (iso: string) => string {
  const today = useToday();
  const f = useFormat();
  return useCallback((iso: string) => {
    const d = toDate(iso);
    const diff = d ? differenceInCalendarDays(d, today) : -1;
    return diff >= 0 && diff < 2 ? f.formatDate(iso, "relative") : f.formatDate(iso, "weekday");
  }, [today, f]);
}

/**
 * Frost nights of a forecast plus the one sentence used for them everywhere
 * ("Frostgefahr in 5 Nächten, bis −6 °C (Mi)"). Same threshold and days on
 * "Heute" and on the weather page — see `summarizeFrost`.
 */
export function useFrostSummary(forecast: { date: string; tempMin: number }[] | undefined): { summary: FrostSummary; title: string } | null {
  const { t } = useTranslation();
  const f = useFormat();
  const today = useToday();
  const dayLabel = useDayLabel();
  const threshold = useStore((s) => s.alerts.frostThresholdC);
  return useMemo(() => {
    const summary = forecast ? summarizeFrost(forecast, threshold, toISODate(today)) : null;
    if (!summary) return null;
    const title = t("alerts.frostGroupTitle", {
      count: summary.nights.length,
      temp: f.formatTemperature(summary.coldest.tempMin),
      day: dayLabel(summary.coldest.date),
    });
    return { summary, title };
  }, [forecast, threshold, today, t, f, dayLabel]);
}

/**
 * "Vlies-Aufgabe anlegen": turns a frost warning into a task due on the first
 * frost night, with undo. Once planned, the button opens that task instead.
 */
export function FrostTaskButton({ summary, className }: { summary: FrostSummary; className?: string }) {
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();
  const { toast } = useToast();
  const dayLabel = useDayLabel();
  const { tasks, gardens, activeGardenId, addTask, deleteTask } = useStore(
    useShallow((s) => ({ tasks: s.tasks, gardens: s.gardens, activeGardenId: s.activeGardenId, addTask: s.addTask, deleteTask: s.deleteTask })),
  );
  const title = t("alerts.fleeceTaskTitle");
  const due = summary.nights[0].date;
  const existing = tasks.find((x) => !x.completedDate && x.title === title && x.dueDate.slice(0, 10) === due);
  const gardenId = (gardens.find((g) => g.id === activeGardenId) ?? gardens[0])?.id;

  if (existing) {
    return (
      <Button variant="ghost" size="sm" className={className} onClick={() => navigate(`/tasks?task=${encodeURIComponent(existing.id)}`)}>
        <CalendarCheck size={16} aria-hidden="true" />
        {t("alerts.fleeceTaskPlanned", { day: dayLabel(due) })}
      </Button>
    );
  }
  if (!gardenId) return null;

  const create = () => {
    addTask({
      gardenId,
      type: "custom",
      title,
      dueDate: due,
      description: t("alerts.fleeceTaskDesc", {
        nights: summary.nights.map((n) => `${dayLabel(n.date)} ${f.formatTemperature(n.tempMin)}`).join(", "),
      }),
    });
    const added = useStore.getState().tasks.at(-1);
    toast(t("alerts.fleeceTaskAdded", { day: dayLabel(due) }), "success", {
      action: added ? { label: t("common.undo"), onClick: () => deleteTask(added.id) } : undefined,
    });
  };

  return (
    <Button variant="secondary" size="sm" className={className} onClick={create}>
      <CalendarPlus size={16} aria-hidden="true" />
      {t("alerts.fleeceTask")}
    </Button>
  );
}
