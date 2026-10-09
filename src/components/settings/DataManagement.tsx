import { daysSince } from "@/lib/format";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Upload, FileSpreadsheet, ShieldCheck, HardDrive, GitMerge, Replace, TriangleAlert } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/hooks/useFormat";
import { useToday } from "@/hooks/useToday";
import { buildCostsCsv, exportAllData, exportHarvestsCsv, exportExpensesCsv, type GardenerExport } from "@/lib/dataExport";
import { importAllData, validateExportFile, type ImportMode, type ImportResult } from "@/lib/dataImport";

const STAT_KEYS = ["gardens", "tasks", "harvests", "journalEntries", "expenses"] as const;

/** Backup status, full backup/restore and CSV exports. The destructive "delete all" lives in the settings danger zone. */
export function DataManagement() {
  const { t } = useTranslation();
  const { formatDate } = useFormat();
  const today = useToday();
  const { lastBackupDate, harvests, expenses, feedEntries, healthEvents, hasData } = useStore(useShallow((s) => ({
    lastBackupDate: s.lastBackupDate, harvests: s.harvests, expenses: s.expenses, feedEntries: s.feedEntries, healthEvents: s.healthEvents,
    // Anything worth keeping: a bed or any record. Before that a backup is no urgent matter.
    hasData: s.gardens.some((g) => g.beds.length > 0) || s.harvests.length > 0 || s.journalEntries.length > 0 || s.expenses.length > 0 || s.animals.length > 0 || s.tasks.length > 0,
  })));
  // Same rows as the Kosten page (manual expenses + counted feed/health costs).
  const costRows = useMemo(() => buildCostsCsv({ expenses, feedEntries, healthEvents }).rows, [expenses, feedEntries, healthEvents]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<GardenerExport | null>(null);

  const handleExportAll = () => {
    exportAllData();
    toast(t("dataManagement.exportSuccess"), "success");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    file.text()
      .then((content) => {
        const json: unknown = JSON.parse(content);
        if (!validateExportFile(json)) throw new Error("invalid");
        setPending(json);
      })
      .catch(() => toast(t("dataManagement.invalidFile"), "error"));
  };

  const summary = (result: ImportResult) => {
    const stats = result.stats as Partial<Record<(typeof STAT_KEYS)[number], number>>;
    const parts = STAT_KEYS.filter((k) => (stats[k] ?? 0) > 0).map((k) => t(`dataManagement.counts.${k}`, { count: stats[k] }));
    return parts.length ? t("dataManagement.importedSummary", { items: parts.join(", ") }) : t("dataManagement.importSuccess");
  };

  const handleImport = (mode: ImportMode) => {
    if (!pending) return;
    const result = importAllData(pending, mode);
    setPending(null);
    if (result.success) toast(summary(result), "success");
    else toast(t("dataManagement.importError"), "error");
  };

  // Same threshold as the hint on "Heute" (BackupHint): two weeks old = time for a new one.
  const stale = lastBackupDate !== null && daysSince(lastBackupDate, today) >= 14;

  return (
    <div className="space-y-5">
      <div className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${stale ? "bg-warning/10 dark:bg-warning/15" : "bg-gray-50 dark:bg-white/5"}`}>
        {!lastBackupDate
          ? <HardDrive size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-500 dark:text-gray-400" />
          : stale
            ? <TriangleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-warning" />
            : <ShieldCheck size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-positive" />}
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {lastBackupDate
            ? (
              <>
                {/* Same phrase as the reminder on "Heute"; the exact date on hover. */}
                <time dateTime={lastBackupDate} title={formatDate(lastBackupDate, "date")} className="font-medium">
                  {t("dashboard.backup.old", { count: daysSince(lastBackupDate, today) })}
                </time>
                {stale && <span className="block text-xs text-gray-600 dark:text-gray-300">{t("dataManagement.backupStale")}</span>}
              </>
            )
            : t(hasData ? "dataManagement.noBackup" : "dataManagement.nothingYet")}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button variant={hasData ? "primary" : "secondary"} onClick={handleExportAll}>
          <Download size={16} aria-hidden="true" />
          {t("dataManagement.exportAll")}
        </Button>
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} aria-hidden="true" />
          {t("dataManagement.importBackup")}
        </Button>
        <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFileSelect} aria-label={t("dataManagement.importBackup")} />
      </div>

      {/* Only exports that have rows: without harvests or expenses the whole
          subsection waits (a heading over a sentence with no button reads as broken). */}
      {(harvests.length > 0 || costRows > 0) && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t("dataManagement.csvTitle")}</p>
          {/* Secondary buttons with a download icon: they read as actions, not as text. */}
          <div className="flex flex-wrap gap-2">
            {harvests.length > 0 && (
              <Button variant="secondary" size="sm" onClick={exportHarvestsCsv}>
                <FileSpreadsheet size={14} aria-hidden="true" />
                {t("dataManagement.exportHarvestsCsv")}
                <span className="text-gray-500 tabular-nums dark:text-gray-400">{harvests.length}</span>
                <Download size={14} aria-hidden="true" className="text-gray-500 dark:text-gray-400" />
              </Button>
            )}
            {costRows > 0 && (
              <Button variant="secondary" size="sm" onClick={exportExpensesCsv}>
                <FileSpreadsheet size={14} aria-hidden="true" />
                {t("dataManagement.exportExpensesCsv")}
                <span className="text-gray-500 tabular-nums dark:text-gray-400">{costRows}</span>
                <Download size={14} aria-hidden="true" className="text-gray-500 dark:text-gray-400" />
              </Button>
            )}
          </div>
        </div>
      )}

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={t("dataManagement.importMode")}
        description={t("dataManagement.importModeDesc")}
        footer={<Button variant="ghost" onClick={() => setPending(null)}>{t("common.cancel")}</Button>}
      >
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => handleImport("merge")}
            className="flex min-h-14 items-start gap-3 rounded-xl border border-gray-200 p-4 text-left hover:border-garden-600 hover:bg-garden-50/50 dark:border-white/10 dark:hover:border-garden-400 dark:hover:bg-garden-500/10"
          >
            <GitMerge size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-garden-700 dark:text-garden-300" />
            <span>
              <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{t("dataManagement.mergeTitle")}</span>
              <span className="block text-sm text-gray-600 dark:text-gray-400">{t("dataManagement.mergeDesc")}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleImport("overwrite")}
            className="flex min-h-14 items-start gap-3 rounded-xl border border-gray-200 p-4 text-left hover:border-danger/50 hover:bg-danger/5 dark:border-white/10"
          >
            <Replace size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-danger" />
            <span>
              <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{t("dataManagement.overwriteTitle")}</span>
              <span className="block text-sm text-gray-600 dark:text-gray-400">{t("dataManagement.overwriteDesc")}</span>
            </span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
