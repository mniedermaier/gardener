import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Check, ArrowRight, X } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";

const DISMISS_KEY = "gardener-getting-started-dismissed";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export interface Step {
  id: string;
  done: boolean;
  to: string;
}

/** The first-run checklist, derived from what already exists — no extra state to keep in sync. */
export function useGettingStartedSteps(): Step[] {
  const { gardens, tasks, locationLat, weatherApiKey } = useStore(
    useShallow((s) => ({ gardens: s.gardens, tasks: s.tasks, locationLat: s.locationLat, weatherApiKey: s.weatherApiKey })),
  );
  const hasBed = gardens.some((g) => g.beds.length > 0);
  const hasPlant = gardens.some((g) => g.beds.some((b) => b.cells.length > 0));
  return [
    { id: "location", done: locationLat !== null, to: "/settings" },
    { id: "bed", done: hasBed, to: "/planner" },
    { id: "plant", done: hasPlant, to: "/planner" },
    { id: "tasks", done: tasks.length > 0, to: "/tasks" },
    { id: "weather", done: Boolean(weatherApiKey), to: "/settings" },
  ];
}

/** "Erste Schritte" instead of a dashboard full of zeros. Hidden once done or dismissed. */
export const GettingStarted = memo(function GettingStarted({ steps }: { steps: Step[] }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(readDismissed);
  const doneCount = steps.filter((s) => s.done).length;
  if (dismissed || doneCount === steps.length) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Not persisted in private mode; hidden for this session anyway.
    }
  };

  const nextId = steps.find((s) => !s.done)?.id;

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t("dashboard.start.title")}</h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {t("dashboard.start.progress", { done: doneCount, total: steps.length })}
          </p>
        </div>
        <IconButton icon={X} label={t("dashboard.start.dismiss")} size="sm" onClick={dismiss} />
      </div>
      <div className="mx-4 mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 sm:mx-5 dark:bg-white/10" aria-hidden="true">
        <div className="h-full rounded-full bg-garden-600 transition-all dark:bg-garden-400" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-3 divide-y divide-gray-100 border-t border-gray-100 dark:divide-white/5 dark:border-white/5">
        {steps.map((step, i) => {
          const isNext = step.id === nextId;
          return (
            <li key={step.id}>
              <Link
                to={step.to}
                className={`flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 sm:px-5 dark:hover:bg-white/5 ${isNext ? "bg-garden-50/50 dark:bg-garden-500/5" : ""}`}
              >
                <span
                  className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                    step.done
                      ? "bg-garden-600 text-white dark:bg-garden-500 dark:text-gray-950"
                      : isNext
                        ? "border-2 border-garden-600 text-garden-700 dark:border-garden-400 dark:text-garden-300"
                        : "border-2 border-gray-300 text-gray-500 dark:border-white/20 dark:text-gray-400"
                  }`}
                  aria-hidden="true"
                >
                  {step.done ? <Check size={14} strokeWidth={3} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium ${step.done ? "text-gray-500 line-through decoration-gray-300 dark:text-gray-400 dark:decoration-white/20" : "text-gray-900 dark:text-gray-100"}`}>
                    {t(`dashboard.start.${step.id}`)}
                    {step.done && <span className="sr-only"> ({t("dashboard.start.done")})</span>}
                  </span>
                  {!step.done && <span className="block text-xs text-gray-500 dark:text-gray-400">{t(`dashboard.start.${step.id}Hint`)}</span>}
                </span>
                {!step.done && <ArrowRight size={16} aria-hidden="true" className={isNext ? "text-garden-700 dark:text-garden-300" : "text-gray-400"} />}
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
});
