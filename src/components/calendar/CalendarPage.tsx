import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/ui/PageHeader";
import { SeasonTimeline } from "./SeasonTimeline";
import { SuccessionPlanner } from "./SuccessionPlanner";

export function CalendarPage() {
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader title={t("calendar.title")} description={t("calendar.pageSubtitle")} />
      <div className="space-y-6">
        <SeasonTimeline />
        <SuccessionPlanner />
      </div>
    </div>
  );
}
