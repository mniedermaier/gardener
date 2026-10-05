import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Sprout } from "lucide-react";
import { useSowingAgenda } from "@/hooks/useSowingAgenda";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PlantableNowRows } from "@/components/calendar/PlantableNowList";

/**
 * What can be sown or planted now and in the next four weeks. Same agenda as
 * the calendar ("Jetzt säen & pflanzen"). Rows only; the caller provides the card.
 */
export const PlantingAdvisor = memo(function PlantingAdvisor() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { now, soon } = useSowingAgenda();

  if (now.length + soon.length === 0) {
    return (
      <EmptyState
        compact
        icon={Sprout}
        title={t("advisor.emptyTitle")}
        description={t("advisor.emptyText")}
        action={
          <Button variant="secondary" size="sm" onClick={() => navigate("/calendar")}>
            <CalendarDays size={14} aria-hidden="true" />
            {t("advisor.openCalendar")}
          </Button>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-gray-100 dark:divide-white/5">
      <PlantableNowRows now={now} soon={soon} limit={6} />
    </ul>
  );
});
