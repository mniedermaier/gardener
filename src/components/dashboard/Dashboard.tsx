import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  LayoutGrid, Sprout, CalendarDays, Apple, TrendingUp,
  AlertTriangle, ArrowRight, Star,
} from "lucide-react";
import { useStore } from "@/store";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { Card } from "@/components/ui/Card";
import { PlantingAdvisor } from "./PlantingAdvisor";
import { isAfter, isBefore, parseISO, startOfWeek, endOfWeek, format } from "date-fns";

function StatCard({ icon: Icon, value, label, color, onClick }: {
  icon: typeof LayoutGrid; value: string | number; label: string; color: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold sm:text-xl">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </button>
  );
}

export function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { gardens, tasks, harvests, expenses, lastBackupDate } = useStore();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const totalBeds = gardens.reduce((s, g) => s + g.beds.length, 0);
  const totalPlantings = gardens.reduce((s, g) => s + g.beds.reduce((sb, b) => sb + b.cells.length, 0), 0);
  const uniquePlantIds = new Set<string>();
  for (const g of gardens) for (const b of g.beds) for (const c of b.cells) uniquePlantIds.add(c.plantId);

  const upcomingTasks = useMemo(() =>
    tasks
      .filter((t) => !t.completedDate && !isAfter(parseISO(t.dueDate), weekEnd))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5),
    [tasks, weekEnd]
  );

  const overdueTasks = tasks.filter((t) => !t.completedDate && isBefore(parseISO(t.dueDate), weekStart));

  const totalHarvestKg = harvests.reduce((s, h) => s + (h.weightGrams ?? 0), 0) / 1000;
  const totalExpenseEur = expenses.reduce((s, e) => s + e.amountCents, 0) / 100;

  const recentHarvests = useMemo(() =>
    [...harvests].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3),
    [harvests]
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("dashboard.title")}</h1>
        <p className="text-sm text-gray-500">{t("dashboard.subtitle", { date: format(now, "dd.MM.yyyy") })}</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatCard icon={LayoutGrid} value={totalBeds} label={t("dashboard.beds")} color="bg-garden-600" onClick={() => navigate("/planner")} />
        <StatCard icon={Sprout} value={uniquePlantIds.size} label={t("dashboard.plantTypes")} color="bg-emerald-600" onClick={() => navigate("/plants")} />
        <StatCard icon={CalendarDays} value={upcomingTasks.length} label={t("dashboard.tasksDue")} color="bg-blue-600" onClick={() => navigate("/calendar")} />
        <StatCard icon={Apple} value={`${totalHarvestKg.toFixed(1)} kg`} label={t("dashboard.harvested")} color="bg-amber-600" onClick={() => navigate("/harvest")} />
      </div>

      {/* Backup reminder */}
      {(() => {
        const daysSinceBackup = lastBackupDate
          ? Math.floor((Date.now() - new Date(lastBackupDate).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        if (daysSinceBackup === null || daysSinceBackup >= 7) {
          return (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle size={12} className="mr-1.5 inline" />
                {daysSinceBackup === null ? t("dashboard.noBackup") : t("dashboard.backupOld", { days: daysSinceBackup })}
              </p>
              <button onClick={() => navigate("/settings")} className="text-xs font-medium text-amber-700 underline dark:text-amber-400">
                {t("dashboard.backupNow")}
              </button>
            </div>
          );
        }
        return null;
      })()}

      <div className="mb-6">
        <PlantingAdvisor />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Tasks */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <CalendarDays size={16} className="text-blue-500" />
              {t("dashboard.upcomingTasks")}
            </h2>
            <button onClick={() => navigate("/calendar")} className="text-xs text-garden-600 hover:underline">
              {t("dashboard.viewAll")} <ArrowRight size={12} className="ml-0.5 inline" />
            </button>
          </div>
          {overdueTasks.length > 0 && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
              <AlertTriangle size={14} />
              {t("dashboard.overdueCount", { count: overdueTasks.length })}
            </div>
          )}
          {upcomingTasks.length > 0 ? (
            <div className="space-y-2">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                  <span className="text-sm">{task.title}</span>
                  <span className="text-xs text-gray-400">{task.dueDate}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">{t("dashboard.noTasks")}</p>
          )}
        </Card>

        {/* Recent Harvests */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Apple size={16} className="text-amber-500" />
              {t("dashboard.recentHarvests")}
            </h2>
            <button onClick={() => navigate("/harvest")} className="text-xs text-garden-600 hover:underline">
              {t("dashboard.viewAll")} <ArrowRight size={12} className="ml-0.5 inline" />
            </button>
          </div>
          {recentHarvests.length > 0 ? (
            <div className="space-y-2">
              {recentHarvests.map((h) => {
                const plant = plantMap.get(h.plantId);
                return (
                  <div key={h.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                    <span className="flex items-center gap-2 text-sm">
                      {plant && <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={20} />}
                      {getPlantName(h.plantId)}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {h.weightGrams && <span>{h.weightGrams >= 1000 ? `${(h.weightGrams / 1000).toFixed(1)} kg` : `${h.weightGrams} g`}</span>}
                      <span className="flex text-amber-400">
                        {Array.from({ length: h.quality }, (_, i) => <Star key={i} size={10} fill="currentColor" />)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">{t("dashboard.noHarvests")}</p>
          )}
        </Card>

        {/* Garden Overview */}
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <LayoutGrid size={16} className="text-garden-500" />
            {t("dashboard.gardenOverview")}
          </h2>
          {gardens.length > 0 ? (
            <div className="space-y-2">
              {gardens.map((g) => (
                <div key={g.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                  <div>
                    <span className="text-sm font-medium">{g.name}</span>
                    <span className="ml-2 text-xs text-gray-400">{g.season}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {g.beds.length} {t("dashboard.beds")} / {g.beds.reduce((s, b) => s + b.cells.length, 0)} {t("dashboard.plantings")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <p className="mb-2 text-sm text-gray-400">{t("dashboard.noGardens")}</p>
              <button onClick={() => navigate("/planner")} className="text-sm font-medium text-garden-600 hover:underline">
                {t("planner.newGarden")} <ArrowRight size={12} className="ml-0.5 inline" />
              </button>
            </div>
          )}
        </Card>

        {/* Quick Info */}
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <TrendingUp size={16} className="text-garden-500" />
            {t("dashboard.quickStats")}
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t("dashboard.totalPlantings")}</span>
              <span className="text-sm font-bold">{totalPlantings}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t("dashboard.totalHarvest")}</span>
              <span className="text-sm font-bold">{totalHarvestKg.toFixed(1)} kg</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t("dashboard.totalExpenses")}</span>
              <span className="text-sm font-bold">{totalExpenseEur.toFixed(2)} €</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t("dashboard.harvestEntries")}</span>
              <span className="text-sm font-bold">{harvests.length}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
