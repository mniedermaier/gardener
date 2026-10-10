import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { SeasonTimeline } from "./SeasonTimeline";
import { SuccessionPlanner } from "./SuccessionPlanner";

export function CalendarPage() {
  const { t } = useTranslation();
  // Without beds the page is only the sow-now list, so the subtitle says that.
  const hasBeds = useStore(useShallow((s) => s.gardens.some((g) => g.beds.length > 0)));

  return (
    <div>
      <PageHeader title={t("calendar.title")} description={t(hasBeds ? "calendar.pageSubtitle" : "calendar.pageSubtitleNoBeds")} />
      <div className="space-y-6">
        <SeasonTimeline />
        <SuccessionPlanner />
      </div>
    </div>
  );
}
