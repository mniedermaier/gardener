import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Download, Upload, FileSpreadsheet, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { useStore } from "@/store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { exportAllData, exportHarvestsCsv, exportExpensesCsv } from "@/lib/dataExport";
import { importAllData, validateExportFile, clearAllData, type ImportMode, type ImportResult } from "@/lib/dataImport";

export function DataManagement() {
  const { t } = useTranslation();
  const { lastBackupDate, harvests, expenses } = useStore();
  const { toast, confirm } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showModeChoice, setShowModeChoice] = useState(false);
  const [pendingFile, setPendingFile] = useState<string | null>(null);

  const handleExportAll = () => {
    exportAllData();
    toast(t("dataManagement.exportSuccess"), "success");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      try {
        const json = JSON.parse(content);
        if (!validateExportFile(json)) {
          toast(t("dataManagement.invalidFile"), "error");
          return;
        }
        setPendingFile(content);
        setShowModeChoice(true);
      } catch {
        toast(t("dataManagement.invalidFile"), "error");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = (mode: ImportMode) => {
    if (!pendingFile) return;
    const json = JSON.parse(pendingFile);
    const result = importAllData(json, mode);
    setImportResult(result);
    setShowModeChoice(false);
    setPendingFile(null);
    if (result.success) {
      toast(t("dataManagement.importSuccess"), "success");
    } else {
      toast(result.error ?? t("dataManagement.importError"), "error");
    }
  };

  const handleClearAll = async () => {
    if (await confirm(t("dataManagement.clearConfirm"))) {
      clearAllData();
    }
  };

  const backupAge = lastBackupDate
    ? Math.floor((Date.now() - new Date(lastBackupDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">{t("dataManagement.title")}</h2>

      {/* Backup status */}
      <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
        {lastBackupDate ? (
          <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <CheckCircle size={14} className="text-garden-500" />
            {t("dataManagement.lastBackup")}: {new Date(lastBackupDate).toLocaleDateString()} ({backupAge} {t("dataManagement.daysAgo")})
          </p>
        ) : (
          <p className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={14} />
            {t("dataManagement.noBackup")}
          </p>
        )}
      </div>

      {/* Full backup */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={handleExportAll} className="flex-1">
            <Download size={16} />
            {t("dataManagement.exportAll")}
          </Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex-1">
            <Upload size={16} />
            {t("dataManagement.importBackup")}
          </Button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
        </div>

        {/* CSV exports */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="ghost"
            size="sm"
            onClick={exportHarvestsCsv}
            disabled={harvests.length === 0}
            className="flex-1"
          >
            <FileSpreadsheet size={14} />
            {t("dataManagement.exportHarvestsCsv")} ({harvests.length})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exportExpensesCsv}
            disabled={expenses.length === 0}
            className="flex-1"
          >
            <FileSpreadsheet size={14} />
            {t("dataManagement.exportExpensesCsv")} ({expenses.length})
          </Button>
        </div>

        {/* Danger zone */}
        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button variant="danger" size="sm" onClick={handleClearAll}>
            <Trash2 size={14} />
            {t("dataManagement.clearAll")}
          </Button>
        </div>
      </div>

      {/* Import mode dialog */}
      {showModeChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModeChoice(false)} />
          <div className="relative mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-2 text-lg font-semibold">{t("dataManagement.importMode")}</h3>
            <p className="mb-4 text-sm text-gray-500">{t("dataManagement.importModeDesc")}</p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => handleImport("merge")}>
                {t("dataManagement.merge")}
              </Button>
              <Button variant="danger" className="w-full" onClick={() => handleImport("overwrite")}>
                {t("dataManagement.overwrite")}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => { setShowModeChoice(false); setPendingFile(null); }}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import result */}
      {importResult?.success && (
        <div className="mt-3 rounded-lg bg-garden-50 p-3 text-xs text-garden-700 dark:bg-garden-900/20 dark:text-garden-400">
          {t("dataManagement.imported")}:
          {importResult.stats.gardens > 0 && ` ${importResult.stats.gardens} ${t("dataManagement.statsGardens")}`}
          {importResult.stats.tasks > 0 && `, ${importResult.stats.tasks} ${t("dataManagement.statsTasks")}`}
          {importResult.stats.harvests > 0 && `, ${importResult.stats.harvests} ${t("dataManagement.statsHarvests")}`}
          {importResult.stats.journalEntries > 0 && `, ${importResult.stats.journalEntries} ${t("dataManagement.statsJournal")}`}
          {importResult.stats.expenses > 0 && `, ${importResult.stats.expenses} ${t("dataManagement.statsExpenses")}`}
        </div>
      )}
    </Card>
  );
}
