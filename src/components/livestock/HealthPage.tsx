import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bird, ClipboardList, Coins, HeartCrack, HeartPulse, Pencil, Plus, Syringe, Trash2 } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { useFormat } from "@/hooks/useFormat";
import { useOpenAddOnNavigate } from "@/hooks/useOpenAddOnNavigate";
import { toDate } from "@/lib/format";
import type { AnimalType, HealthEvent, HealthEventType } from "@/types/animal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Select } from "@/components/ui/Select";
import { List, ListRow } from "@/components/ui/List";
import { Menu } from "@/components/ui/Menu";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { HowCalculated } from "@/components/ui/charts";
import { HEALTH_ICON, HEALTH_TONE } from "./icons";
import { HEALTH_EVENT_TYPES, HealthDialog, IconTile, animalLabel, useRecordActions } from "./shared";
import { groupByMonth } from "./groupByMonth";

/** Animals with common routine vaccinations (poultry: ND; rabbits: RHD/Myxo; goats/sheep: clostridia). Bees have none. */
const VACCINATED_TYPES: AnimalType[] = ["chicken", "duck", "quail", "rabbit", "goat", "sheep"];
const VACCINATION_INTERVAL_DAYS = 180;

export function HealthPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();
  const { deleteHealth } = useRecordActions();
  const { animals, healthEvents } = useStore(useShallow((s) => ({ animals: s.animals, healthEvents: s.healthEvents })));

  const [filterAnimalId, setFilterAnimalId] = useState("");
  const [filterType, setFilterType] = useState<"" | HealthEventType>("");
  const [dialog, setDialog] = useState<{ open: boolean; entry?: HealthEvent; animalId?: string; type?: HealthEventType }>({ open: false });
  const openAdd = useCallback(() => setDialog({ open: true }), []);
  useOpenAddOnNavigate(openAdd);

  const animalMap = useMemo(() => new Map(animals.map((a) => [a.id, a])), [animals]);
  const filtered = useMemo(
    () => healthEvents
      .filter((h) => (!filterAnimalId || h.animalId === filterAnimalId) && (!filterType || h.type === filterType))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [healthEvents, filterAnimalId, filterType],
  );

  const stats = useMemo(() => {
    const lastVacc = new Map<string, string>();
    for (const h of healthEvents) {
      if (h.type !== "vaccination") continue;
      const cur = lastVacc.get(h.animalId);
      if (!cur || h.date > cur) lastVacc.set(h.animalId, h.date);
    }
    const due: { animalId: string; lastDate?: string; days?: number }[] = [];
    for (const a of animals) {
      if (!VACCINATED_TYPES.includes(a.type)) continue;
      const last = lastVacc.get(a.id);
      const d = last ? toDate(last) : null;
      const days = d ? differenceInCalendarDays(new Date(), d) : undefined;
      if (days === undefined || days > VACCINATION_INTERVAL_DAYS) due.push({ animalId: a.id, lastDate: last, days });
    }
    return {
      cost: healthEvents.reduce((s, h) => s + (h.cost ?? 0), 0),
      losses: healthEvents.filter((h) => h.type === "death").length,
      due,
    };
  }, [healthEvents, animals]);

  const groups = groupByMonth(filtered);
  const addButton = (
    <Button onClick={openAdd}>
      <Plus size={16} aria-hidden="true" />
      {t("livestock.addHealth")}
    </Button>
  );

  return (
    <div>
      <PageHeader title={t("livestock.health.title")} description={t("livestock.health.subtitle")} actions={animals.length > 0 ? addButton : undefined} />

      {animals.length === 0 ? (
        <Card>
          <EmptyState icon={Bird} title={t("livestock.emptyTitle")} description={t("livestock.emptyText")} action={<Button onClick={() => navigate("/livestock")}>{t("livestock.toHerd")}</Button>} />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={t("livestock.health.totalEvents")} value={f.formatNumber(healthEvents.length, { maximumFractionDigits: 0 })} icon={ClipboardList} tone="neutral" />
            <StatCard label={t("livestock.health.totalCost")} value={f.formatCurrency(stats.cost)} icon={Coins} tone="neutral" />
            <StatCard label={t("livestock.health.losses")} value={f.formatNumber(stats.losses, { maximumFractionDigits: 0 })} icon={HeartCrack} tone={stats.losses > 0 ? "danger" : "neutral"} />
            <StatCard label={t("livestock.health.overdueVacc")} value={f.formatNumber(stats.due.length, { maximumFractionDigits: 0 })} icon={Syringe} tone={stats.due.length > 0 ? "warning" : "neutral"} />
          </div>

          {stats.due.length > 0 && (
            <Card padding="none">
              <div className="flex items-start gap-3 px-4 pt-4">
                <IconTile icon={AlertTriangle} tone="warning" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t("livestock.health.dueTitle", { count: stats.due.length })}</h2>
                  <HowCalculated className="mt-1">{t("livestock.health.dueHow", { days: VACCINATION_INTERVAL_DAYS })}</HowCalculated>
                </div>
              </div>
              <ul className="mt-2 divide-y divide-gray-100 dark:divide-white/5">
                {stats.due.map(({ animalId, lastDate }) => {
                  const animal = animalMap.get(animalId);
                  if (!animal) return null;
                  return (
                    <li key={animalId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{animalLabel(animal, t)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {lastDate ? t("livestock.health.lastVaccination", { date: f.formatDate(lastDate, "short") }) : t("livestock.health.neverVaccinated")}
                        </p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => setDialog({ open: true, animalId, type: "vaccination" })}>
                        <Syringe size={14} aria-hidden="true" />
                        {t("livestock.health.logVaccination")}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {healthEvents.length === 0 ? (
            <Card>
              <EmptyState icon={HeartPulse} title={t("livestock.noHealthTitle")} description={t("livestock.noHealth")} action={addButton} />
            </Card>
          ) : (
            <section className="space-y-3">
              <div className="grid gap-3 sm:max-w-lg sm:grid-cols-2">
                {animals.length > 1 && (
                  <Select label={t("livestock.filterAnimal")} value={filterAnimalId} onChange={(e) => setFilterAnimalId(e.target.value)} placeholder={t("livestock.allAnimals")} options={animals.map((a) => ({ value: a.id, label: animalLabel(a, t) }))} />
                )}
                <Select label={t("livestock.healthType")} value={filterType} onChange={(e) => setFilterType(e.target.value as "" | HealthEventType)} placeholder={t("livestock.health.allTypes")} options={HEALTH_EVENT_TYPES.map((ty) => ({ value: ty, label: t(`livestock.healthTypes.${ty}`) }))} />
              </div>
              {groups.length === 0 ? (
                <Card><p className="text-center text-sm text-gray-500 dark:text-gray-400">{t("livestock.emptyFilter")}</p></Card>
              ) : groups.map((g) => (
                <List key={g.key} header={f.formatDate(g.date, "monthYear")}>
                  {g.items.map((h) => {
                    const animal = animalMap.get(h.animalId);
                    return (
                      <ListRow
                        key={h.id}
                        leading={<IconTile icon={HEALTH_ICON[h.type]} tone={HEALTH_TONE[h.type]} />}
                        title={h.description}
                        badges={<Badge tone={HEALTH_TONE[h.type]}>{t(`livestock.healthTypes.${h.type}`)}</Badge>}
                        meta={[animal ? animalLabel(animal, t) : null, f.formatDate(h.date, "relative")].filter(Boolean).join(" · ")}
                        description={h.notes}
                        trailing={h.cost !== undefined ? f.formatCurrency(h.cost) : undefined}
                        onClick={() => setDialog({ open: true, entry: h })}
                        actions={
                          <Menu
                            label={t("common.moreActions")}
                            items={[
                              { label: t("common.edit"), icon: Pencil, onSelect: () => setDialog({ open: true, entry: h }) },
                              ...(animal ? [{ label: t("livestock.openAnimal"), icon: Bird, onSelect: () => navigate(`/livestock/${animal.id}`) }] : []),
                              "separator" as const,
                              { label: t("common.delete"), icon: Trash2, danger: true, onSelect: () => void deleteHealth(h) },
                            ]}
                          />
                        }
                      />
                    );
                  })}
                </List>
              ))}
            </section>
          )}
        </div>
      )}

      <HealthDialog open={dialog.open} entry={dialog.entry} presetAnimalId={dialog.animalId} presetType={dialog.type} onClose={() => setDialog({ open: false })} />
    </div>
  );
}
