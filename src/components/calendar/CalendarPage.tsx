import { useTranslation } from "react-i18next";
import { SeasonTimeline } from "./SeasonTimeline";
import { SuccessionPlanner } from "./SuccessionPlanner";

export function CalendarPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("calendar.title")}</h1>
      <SeasonTimeline />
      <SuccessionPlanner />
    </div>
  );
}
