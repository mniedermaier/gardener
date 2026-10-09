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
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { PROTECTED_ENVIRONMENTS, frostAffectedPlants, frostRiskByBed, summarizeFrost, type BedFrostRisk, type FrostSummary } from "@/lib/weatherAlerts";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/**
 * "Heute", "Morgen", then the short weekday ("Mi") — the day names of the
 * forecast list. `inline` for the middle of a sentence ("für heute angelegt").
 */
export function useDayLabel(): (iso: string, inline?: boolean) => string {
  const today = useToday();
  const f = useFormat();
  return useCallback((iso: string, inline = false) => {
    const d = toDate(iso);
    const diff = d ? differenceInCalendarDays(d, today) : -1;
    return diff >= 0 && diff < 2 ? f.formatDate(iso, inline ? "relativeInline" : "relative") : f.formatDate(iso, "weekday");
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
      day: dayLabel(summary.coldest.date, true),
    });
    return { summary, title };
  }, [forecast, threshold, today, t, f, dayLabel]);
}

/**
 * Which beds and crops the frost hurts (lib/weatherAlerts `frostRiskByBed`),
 * over all gardens: the same answer for the map pins, the hint on "Heute" and
 * "Betroffen sind …" on the weather page.
 */
export function useFrostRisk(summary: FrostSummary | null | undefined): { byBed: Map<string, BedFrostRisk>; plantIds: string[] } {
  const gardens = useStore((s) => s.gardens);
  const plantMap = usePlantMap();
  return useMemo(() => {
    const risks = frostRiskByBed(gardens.flatMap((g) => g.beds), plantMap, summary ?? null);
    return { byBed: new Map(risks.map((r) => [r.bedId, r])), plantIds: frostAffectedPlants(risks) };
  }, [gardens, plantMap, summary]);
}

/**
 * The one sentence naming what the frost hurts, on "Heute" and on the weather
 * page: "Betroffen: Kürbis, Buschbohne, Mais (Kartoffelacker). Mit Vlies …".
 * Without tender crops in reach it falls back to the general advice.
 */
export function useFrostAffectedText(summary: FrostSummary | null | undefined): string {
  const { t } = useTranslation();
  const plantName = usePlantName();
  const gardens = useStore((s) => s.gardens);
  const { byBed, plantIds } = useFrostRisk(summary);
  return useMemo(() => {
    if (plantIds.length === 0) return t("alerts.frostAdvice");
    // Open beds first: they get the full frost, a greenhouse only part of it.
    const beds = gardens.flatMap((g) => g.beds).filter((b) => byBed.has(b.id))
      .sort((a, b) => Number(PROTECTED_ENVIRONMENTS.includes(a.environmentType)) - Number(PROTECTED_ENVIRONMENTS.includes(b.environmentType)));
    if (plantIds.length > 4) {
      const first = [...new Set(beds.flatMap((b) => byBed.get(b.id)!.plantIds))].slice(0, 3).map(plantName);
      return t("alerts.frostAffected", { plants: first.join(", "), count: plantIds.length, beds: beds.map((b) => b.name).join(", ") });
    }
    const parts = beds.map((b) => `${byBed.get(b.id)!.plantIds.map(plantName).join(", ")} (${b.name})`);
    return t("alerts.frostAffectedAll", { plants: parts.join("; ") });
  }, [byBed, plantIds, gardens, plantName, t]);
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
        {t("alerts.fleeceTaskPlanned", { day: dayLabel(due, true) })}
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
        nights: summary.nights.map((n) => `${dayLabel(n.date, true)} ${f.formatTemperature(n.tempMin)}`).join(", "),
      }),
    });
    const added = useStore.getState().tasks.at(-1);
    toast(t("alerts.fleeceTaskAdded", { day: dayLabel(due, true) }), "success", {
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
