import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { HardDriveDownload } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { exportAllData } from "@/lib/dataExport";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

const SNOOZE_KEY = "gardener-backup-snoozed-until";
const DAY = 24 * 60 * 60 * 1000;

function readSnooze(): number {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Quiet system note, not an alarm: only once there is something worth
 * losing (beds or records, plus a week of use or 20 entries) and the last
 * backup is two weeks old. An empty garden never asks for a backup.
 */
export const BackupHint = memo(function BackupHint({ now }: { now: Date }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { lastBackupDate, gardens, harvests, journalEntries, tasks, animalCount, expenseCount } = useStore(
    useShallow((s) => ({
      lastBackupDate: s.lastBackupDate, gardens: s.gardens, harvests: s.harvests, journalEntries: s.journalEntries, tasks: s.tasks,
      animalCount: s.animals.length, expenseCount: s.expenses.length,
    })),
  );
  const [snoozedUntil, setSnoozedUntil] = useState(readSnooze);

  const firstUse = Math.min(...gardens.map((g) => new Date(g.createdAt).getTime()).filter(Number.isFinite), now.getTime());
  const entries = harvests.length + journalEntries.length + tasks.filter((x) => x.completedDate).length;
  const hasContent = gardens.some((g) => g.beds.length > 0) || entries + animalCount + expenseCount > 0;
  const worthKeeping = hasContent && (now.getTime() - firstUse >= 7 * DAY || entries >= 20);
  const daysSince = lastBackupDate ? Math.floor((now.getTime() - new Date(lastBackupDate).getTime()) / DAY) : null;
  const stale = daysSince === null || daysSince >= 14;

  if (!worthKeeping || !stale || snoozedUntil > now.getTime()) return null;

  const snooze = () => {
    const until = now.getTime() + 7 * DAY;
    setSnoozedUntil(until);
    try {
      localStorage.setItem(SNOOZE_KEY, String(until));
    } catch {
      // Private mode: hidden for this session only.
    }
  };

  const backup = () => {
    exportAllData();
    toast(t("dataManagement.exportSuccess"), "success");
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-gray-900">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info dark:bg-info/15" aria-hidden="true">
        <HardDriveDownload size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {daysSince === null ? t("dashboard.backup.never") : t("dashboard.backup.old", { count: daysSince })}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t("dashboard.backup.why")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={backup}>{t("dashboard.backup.action")}</Button>
          <Button size="sm" variant="ghost" onClick={snooze}>{t("dashboard.backup.later")}</Button>
        </div>
      </div>
    </div>
  );
});
