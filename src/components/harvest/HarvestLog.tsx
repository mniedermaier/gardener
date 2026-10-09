import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Apple, Pencil, Plus, Trash2, Hash } from "lucide-react";
import { startOfMonth, subMonths, addMonths, differenceInCalendarDays, differenceInCalendarMonths } from "date-fns";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { useOpenAddParamsOnNavigate } from "@/hooks/useOpenAddOnNavigate";
import { todayISO, toDate, toISODate } from "@/lib/format";
import type { HarvestEntry } from "@/types/harvest";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, focusFirstInvalid } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Menu } from "@/components/ui/Menu";
import { List, ListRow } from "@/components/ui/List";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast, useConfirmDelete } from "@/components/ui/Toast";
import { DateField } from "@/components/ui/DateField";
import { PlantCombobox } from "@/components/records/PlantCombobox";
import { BarChart, KeyFigures } from "@/components/ui/charts";
import { QualityInput, QualityStars, type Quality } from "@/components/records/Quality";
import { useBeds } from "@/components/records/useBeds";
import { useAddFromUrl, type AddParams } from "@/components/records/useAddFromUrl";
import { useToday } from "@/hooks/useToday";

type Unit = "g" | "kg";

interface Draft {
  plantId: string;
  bedId: string;
  date: string;
  amount: string;
  unit: Unit;
  count: string;
  showCount: boolean;
  quality: Quality;
  notes: string;
}

const UNIT_STORAGE = "gardener.harvestUnits";

/** Last weight unit per plant — a per-device convenience, never required. */
function readUnits(): Record<string, Unit> {
  try {
    return JSON.parse(localStorage.getItem(UNIT_STORAGE) ?? "{}") as Record<string, Unit>;
  } catch {
    return {};
  }
}
function rememberUnit(plantId: string, unit: Unit) {
  try {
    localStorage.setItem(UNIT_STORAGE, JSON.stringify({ ...readUnits(), [plantId]: unit }));
  } catch {
    /* storage unavailable: just don't remember */
  }
}

function parseAmount(text: string): number {
  const n = Number(text.trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function HarvestLog() {
  const now = useToday();
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirmDelete = useConfirmDelete();
  const { formatDate, formatWeight, formatNumber, locale } = useFormat();
  const { harvests, addHarvest, updateHarvest, deleteHarvest } = useStore(
    useShallow((s) => ({ harvests: s.harvests, addHarvest: s.addHarvest, updateHarvest: s.updateHarvest, deleteHarvest: s.deleteHarvest })),
  );
  const plants = usePlants();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();
  const beds = useBeds();

  const defaultUnit = useCallback((plantId: string): Unit => {
    const remembered = readUnits()[plantId];
    if (remembered) return remembered;
    return plantMap.get(plantId)?.category === "herb" ? "g" : "kg";
  }, [plantMap]);

  // ---------------------------------------------------------------- dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => ({
    plantId: "", bedId: "", date: todayISO(), amount: "", unit: "kg", count: "", showCount: false, quality: 4, notes: "",
  }));
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const openAdd = useCallback((params: AddParams = {}) => {
    const plantId = params.plant && plantMap.has(params.plant) ? params.plant : "";
    let bedId = params.bed && beds.byId.has(params.bed) ? params.bed : "";
    // Plant grows in exactly one bed → that bed.
    if (plantId && !bedId) {
      const hosts = beds.beds.filter((b) => b.plantIds.has(plantId));
      if (hosts.length === 1) bedId = hosts[0].id;
    }
    setEditingId(null);
    setSubmitted(false);
    setDraft({
      plantId, bedId, date: params.date ?? todayISO(), amount: "", unit: plantId ? defaultUnit(plantId) : "kg",
      count: "", showCount: false, quality: 4, notes: "",
    });
    setDialogOpen(true);
  }, [plantMap, beds, defaultUnit]);
  const openAddPlain = useCallback(() => openAdd(), [openAdd]);
  useOpenAddParamsOnNavigate(openAdd);
  useAddFromUrl(openAdd);

  const openEdit = (h: HarvestEntry) => {
    const g = h.weightGrams ?? 0;
    const unit: Unit = g >= 1000 ? "kg" : g > 0 ? "g" : defaultUnit(h.plantId);
    const amount = g > 0 ? (unit === "kg" ? g / 1000 : g).toLocaleString(locale, { useGrouping: false, maximumFractionDigits: 3 }) : "";
    setEditingId(h.id);
    setSubmitted(false);
    setDraft({
      plantId: h.plantId, bedId: h.bedId, date: h.date, amount, unit,
      count: h.count ? String(h.count) : "", showCount: Boolean(h.count), quality: h.quality, notes: h.notes ?? "",
    });
    setDialogOpen(true);
  };

  const amountNum = draft.amount.trim() ? parseAmount(draft.amount) : 0;
  const countNum = draft.count.trim() ? Math.round(parseAmount(draft.count)) : 0;
  const grams = Number.isFinite(amountNum) ? Math.round(amountNum * (draft.unit === "kg" ? 1000 : 1)) : NaN;
  const amountError = Number.isNaN(grams) || grams < 0 ? t("harvest.invalidAmount") : submitted && !grams && !countNum ? t("harvest.needAmount") : undefined;
  const plantError = submitted && !draft.plantId ? t("harvest.needPlant") : undefined;

  // Same rule as Expenses: "Speichern" stays disabled until the entry is complete.
  const canSave = Boolean(draft.plantId) && !Number.isNaN(grams) && grams >= 0 && (grams > 0 || countNum > 0);

  const amountText = (g?: number, c?: number) =>
    [g ? formatWeight(g) : null, c ? t("harvest.pieces", { count: c }) : null].filter(Boolean).join(" · ");

  const handleSave = () => {
    setSubmitted(true);
    if (!draft.plantId || Number.isNaN(grams) || grams < 0 || (!grams && !countNum)) { focusFirstInvalid(); return; }
    const fields = {
      plantId: draft.plantId,
      bedId: draft.bedId,
      gardenId: beds.byId.get(draft.bedId)?.gardenId ?? beds.beds[0]?.gardenId ?? "",
      date: draft.date,
      weightGrams: grams || undefined,
      count: countNum || undefined,
      quality: draft.quality,
      notes: draft.notes.trim() || undefined,
    };
    if (grams) rememberUnit(draft.plantId, draft.unit);
    const name = getPlantName(draft.plantId);
    if (editingId) {
      const before = harvests.find((h) => h.id === editingId);
      updateHarvest(editingId, fields);
      toast(t("harvest.updated"), "success", before ? { action: { label: t("common.undo"), onClick: () => updateHarvest(before.id, before) } } : undefined);
    } else {
      addHarvest(fields);
      const added = useStore.getState().harvests.at(-1);
      const amount = amountText(fields.weightGrams, fields.count);
      toast(t("harvest.saved", { name, amount }), "success", {
        action: added ? { label: t("common.undo"), onClick: () => deleteHarvest(added.id) } : undefined,
      });
    }
    setDialogOpen(false);
  };

  const handleDelete = async (h: HarvestEntry) => {
    const what = [getPlantName(h.plantId), amountText(h.weightGrams, h.count), formatDate(h.date)].filter(Boolean).join(" · ");
    if (!(await confirmDelete("harvest", what))) return;
    deleteHarvest(h.id);
    setDialogOpen(false);
    const { id: _id, ...rest } = h;
    toast(t("harvest.deleted"), "success", { action: { label: t("common.undo"), onClick: () => addHarvest(rest) } });
  };

  // ---------------------------------------------------------------- stats
  const stats = useMemo(() => {
    let total = 0, last30 = 0, qualitySum = 0;
    const byPlant = new Map<string, { grams: number; count: number; entries: number }>();
    for (const h of harvests) {
      const g = h.weightGrams ?? 0;
      total += g;
      qualitySum += h.quality;
      const d = toDate(h.date);
      if (d && differenceInCalendarDays(now, d) < 30) last30 += g;
      const p = byPlant.get(h.plantId) ?? { grams: 0, count: 0, entries: 0 };
      p.grams += g;
      p.count += h.count ?? 0;
      p.entries += 1;
      byPlant.set(h.plantId, p);
    }
    const ranking = [...byPlant.entries()].sort((a, b) => b[1].grams - a[1].grams || b[1].entries - a[1].entries);
    // From the first month with a harvest (at most 12, at least 3 months back),
    // oldest first: a spring start would otherwise leave half the chart empty.
    const earliest = harvests.reduce<string | null>((min, h) => (min === null || h.date < min ? h.date : min), null);
    const earliestMonth = startOfMonth((earliest && toDate(earliest)) || now);
    const span = Math.min(12, Math.max(3, differenceInCalendarMonths(startOfMonth(now), earliestMonth) + 1));
    const first = subMonths(startOfMonth(now), span - 1);
    const months = Array.from({ length: span }, (_, i) => addMonths(first, i));
    const perMonth = new Map(months.map((m) => [toISODate(m).slice(0, 7), 0]));
    for (const h of harvests) {
      const key = h.date.slice(0, 7);
      if (perMonth.has(key)) perMonth.set(key, (perMonth.get(key) ?? 0) + (h.weightGrams ?? 0));
    }
    return {
      total, last30, ranking,
      avgQuality: harvests.length ? qualitySum / harvests.length : 0,
      months: months.map((m) => {
        const key = toISODate(m).slice(0, 7);
        return { key, date: m, kg: (perMonth.get(key) ?? 0) / 1000 };
      }),
    };
  }, [now, harvests]);

  const [showAllPlants, setShowAllPlants] = useState(false);
  const maxPlantGrams = Math.max(1, ...stats.ranking.map(([, s]) => s.grams));
  const rankingShown = showAllPlants ? stats.ranking : stats.ranking.slice(0, 6);

  const groups = useMemo(() => {
    const sorted = [...harvests].sort((a, b) => b.date.localeCompare(a.date));
    const map = new Map<string, HarvestEntry[]>();
    for (const h of sorted) {
      const key = h.date.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), h]);
    }
    return [...map.entries()];
  }, [harvests]);

  // The two most recent months open; older ones on request (like the water log's weeks).
  const [monthsShown, setMonthsShown] = useState(2);
  const editing = editingId ? harvests.find((h) => h.id === editingId) : undefined;
  const kgTick = (kg: number) => formatWeight(kg * 1000, "kg");

  return (
    <div>
      <PageHeader
        title={t("harvest.title")}
        description={t("harvest.subtitle")}
        actions={
          <Button onClick={openAddPlain}>
            <Plus size={16} aria-hidden="true" />
            {t("harvest.add")}
          </Button>
        }
      />

      {harvests.length === 0 ? (
        <Card>
          <EmptyState
            icon={Apple}
            title={t("harvest.emptyTitle")}
            description={t("harvest.emptyText")}
            action={<Button onClick={openAddPlain}><Plus size={16} aria-hidden="true" />{t("harvest.add")}</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <KeyFigures
            hero={{
              label: t("harvest.totalWeight"),
              value: formatWeight(stats.total),
              hint: t("harvest.harvestsCount", { count: harvests.length }),
              icon: Apple,
              tone: "brand",
            }}
            items={[
              { label: t("harvest.last30"), value: formatWeight(stats.last30) },
              {
                label: t("harvest.avgQuality"),
                value: <>{formatNumber(stats.avgQuality)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{t("harvest.outOfFive")}</span></>,
                hint: <QualityStars value={Math.round(stats.avgQuality)} />,
              },
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="min-w-0">
              {/* The subtitle names the range actually drawn (from the first harvest month, 3–12 months). */}
              <CardHeader title={t("harvest.perMonth")} description={t("harvest.perMonthHint", { month: formatDate(stats.months[0].date, "monthYear") })} />
              <BarChart
                caption={t("harvest.perMonth")}
                categoryLabel={t("harvest.month")}
                series={[{ label: t("harvest.totalWeight"), color: "brand" }]}
                height={240}
                data={stats.months.map((m) => ({ key: m.key, label: formatDate(m.date, "month"), fullLabel: formatDate(m.date, "monthYear"), values: [m.kg] }))}
                formatValue={(kg) => formatWeight(kg * 1000)}
                formatTick={kgTick}
                marker={{ index: stats.months.length - 1, label: t("charts.today") }}
              />
            </Card>

            <Card className="min-w-0">
              <CardHeader title={t("harvest.byPlant")} description={t("harvest.byPlantHint")} />
              <ul className="space-y-3">
                {rankingShown.map(([pid, s]) => {
                  const plant = plantMap.get(pid);
                  return (
                    <li key={pid} className="flex items-center gap-3">
                      {plant ? <PlantIconDisplay plantId={pid} emoji={plant.icon} size={24} /> : <Apple size={20} aria-hidden="true" className="text-gray-500" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="truncate font-medium text-gray-900 dark:text-gray-100">{getPlantName(pid)}</span>
                          <span className="shrink-0 font-medium text-gray-900 tabular-nums dark:text-gray-100">
                            {s.grams ? formatWeight(s.grams) : t("harvest.pieces", { count: s.count })}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-gray-100 dark:bg-white/10" aria-hidden="true">
                            <div className="h-1.5 rounded-full bg-garden-500 dark:bg-garden-400" style={{ width: `${Math.max(2, (s.grams / maxPlantGrams) * 100)}%` }} />
                          </div>
                          <span className="w-20 shrink-0 text-right text-xs text-gray-500 dark:text-gray-400">{t("harvest.harvestsCount", { count: s.entries })}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {stats.ranking.length > 6 && (
                <Button variant="ghost" size="sm" className="mt-3 -ml-3" onClick={() => setShowAllPlants((v) => !v)}>
                  {showAllPlants ? t("harvest.showLess") : t("harvest.showAll", { count: stats.ranking.length })}
                </Button>
              )}
            </Card>
          </div>

          <section aria-label={t("harvest.log")} className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t("harvest.log")}</h2>
            {groups.slice(0, monthsShown).map(([month, entries]) => {
              const monthGrams = entries.reduce((s, h) => s + (h.weightGrams ?? 0), 0);
              return (
                <List
                  key={month}
                  header={
                    <span className="flex items-center justify-between gap-2">
                      <span>{formatDate(`${month}-01`, "monthYear")}</span>
                      {monthGrams > 0 && <span className="font-medium tabular-nums">{formatWeight(monthGrams)}</span>}
                    </span>
                  }
                >
                  {entries.map((h) => {
                    const plant = plantMap.get(h.plantId);
                    const bedLabel = beds.label(h.bedId);
                    return (
                      <ListRow
                        key={h.id}
                        onClick={() => openEdit(h)}
                        leading={plant ? <PlantIconDisplay plantId={h.plantId} emoji={plant.icon} size={28} /> : <Apple size={20} aria-hidden="true" className="text-gray-500" />}
                        title={getPlantName(h.plantId)}
                        // One date format per list group (DESIGN_SYSTEM): the short date, never "vor 5 Tagen" next to "2. Okt.".
                        meta={[bedLabel, <time key="d" dateTime={h.date}>{formatDate(h.date)}</time>]}
                        badges={<QualityStars value={h.quality} />}
                        description={h.notes}
                        trailing={amountText(h.weightGrams, h.count) || "–"}
                        actions={
                          <Menu
                            label={t("common.moreActions")}
                            items={[
                              { label: t("common.edit"), icon: Pencil, onSelect: () => openEdit(h) },
                              "separator",
                              { label: t("common.delete"), icon: Trash2, danger: true, onSelect: () => void handleDelete(h) },
                            ]}
                          />
                        }
                      />
                    );
                  })}
                </List>
              );
            })}
            {groups.length > monthsShown && (
              <Button variant="secondary" onClick={() => setMonthsShown((n) => n + 3)}>{t("harvest.showOlder")}</Button>
            )}
          </section>
        </div>
      )}

      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingId ? t("harvest.edit") : t("harvest.add")}
        footer={
          <>
            {editing && (
              <Button variant="danger-ghost" className="mr-auto" onClick={() => void handleDelete(editing)}>
                <Trash2 size={16} aria-hidden="true" />
                {t("common.delete")}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={!canSave}>{t("common.save")}</Button>
          </>
        }
      >
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div>
            <PlantCombobox
              label={t("harvest.what")}
              plants={plants}
              beds={beds.beds}
              value={draft.plantId}
              bedId={draft.bedId}
              autoFocus={!draft.plantId}
              invalid={Boolean(plantError)}
              onChange={({ plantId, bedId }) => {
                const hosts = beds.beds.filter((b) => b.plantIds.has(plantId));
                patch({
                  plantId,
                  bedId: bedId ?? (hosts.length === 1 ? hosts[0].id : draft.bedId),
                  ...(!draft.amount && plantId ? { unit: defaultUnit(plantId) } : {}),
                });
              }}
            />
            {plantError && <p className="mt-1 text-xs font-medium text-danger">{plantError}</p>}
          </div>

          {beds.beds.length > 0 && (
            <Select
              label={t("harvest.bed")}
              value={draft.bedId}
              onChange={(e) => patch({ bedId: e.target.value })}
              placeholder={t("harvest.noBed")}
              options={beds.options}
            />
          )}

          <div>
            <div className="flex items-end gap-2">
              <Input
                wrapperClassName="flex-1"
                label={t("harvest.weight")}
                inputMode="decimal"
                autoComplete="off"
                value={draft.amount}
                onChange={(e) => patch({ amount: e.target.value })}
                placeholder={t("common.examplePlaceholder", { value: draft.unit === "kg" ? formatNumber(1.5) : formatNumber(250) })}
                error={amountError}
              />
              <SegmentedControl
                className={amountError ? "mb-5" : ""}
                label={t("harvest.unit")}
                value={draft.unit}
                onChange={(unit) => patch({ unit })}
                options={[{ value: "g", label: "g" }, { value: "kg", label: "kg" }]}
              />
            </div>
            {draft.showCount ? (
              <Input
                wrapperClassName="mt-3"
                label={t("harvest.count")}
                inputMode="numeric"
                value={draft.count}
                onChange={(e) => patch({ count: e.target.value })}
                placeholder={t("common.examplePlaceholder", { value: formatNumber(12) })}
              />
            ) : (
              <Button variant="ghost" size="sm" className="mt-1 -ml-3" onClick={() => patch({ showCount: true })}>
                <Hash size={14} aria-hidden="true" />
                {t("harvest.addCount")}
              </Button>
            )}
          </div>

          <DateField label={t("harvest.date")} value={draft.date} onChange={(date) => patch({ date })} />
          <QualityInput label={t("harvest.quality")} value={draft.quality} onChange={(quality) => patch({ quality })} />
          <Textarea label={t("harvest.notes")} rows={2} value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder={t("harvest.notesPlaceholder")} />
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </form>
      </Modal>
    </div>
  );
}
