import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useNavigate } from "react-router-dom";
import { CloudRain, Droplets, Pencil, Plus, Trash2 } from "lucide-react";
import { addWeeks, endOfWeek, getISOWeek, startOfMonth, startOfWeek, subWeeks } from "date-fns";
import { useStore } from "@/store";
import { useFormat } from "@/hooks/useFormat";
import { useOpenAddOnNavigate } from "@/hooks/useOpenAddOnNavigate";
import { toDate, toISODate, todayISO } from "@/lib/format";
import type { WaterEntry } from "@/types/water";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Menu } from "@/components/ui/Menu";
import { List, ListRow } from "@/components/ui/List";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { useToast } from "@/components/ui/Toast";
import { DateField } from "@/components/ui/DateField";
import { BarChart } from "@/components/ui/charts";
import { useBeds } from "@/components/records/useBeds";
import { useAddFromUrl, type AddParams } from "@/components/records/useAddFromUrl";

const METHODS = ["manual", "hose", "drip", "sprinkler", "rain"] as const;
type Method = (typeof METHODS)[number];
const CHART_WEEKS = 8;
const QUICK_LITERS = [5, 10, 20, 50];

interface Draft { bedId: string; liters: string; method: Method; duration: string; date: string; notes: string }

const num = (s: string) => Number(s.trim().replace(",", "."));
const weekStart = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });

export function WaterTracker() {
  const { t } = useTranslation();
  const { toast, confirm } = useToast();
  const { formatDate, formatVolume, formatNumber, locale } = useFormat();
  const { waterEntries, addWaterEntry, updateWaterEntry, deleteWaterEntry } = useStore(
    useShallow((s) => ({ waterEntries: s.waterEntries, addWaterEntry: s.addWaterEntry, updateWaterEntry: s.updateWaterEntry, deleteWaterEntry: s.deleteWaterEntry })),
  );
  const beds = useBeds();
  const navigate = useNavigate();

  // ---------------------------------------------------------------- dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [draft, setDraft] = useState<Draft>({ bedId: "", liters: "", method: "manual", duration: "", date: todayISO(), notes: "" });
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const lastEntry = useMemo(() => [...waterEntries].sort((a, b) => b.date.localeCompare(a.date))[0], [waterEntries]);

  const openAdd = useCallback((params: AddParams = {}) => {
    setEditingId(null);
    setSubmitted(false);
    const bedId = params.bed && beds.byId.has(params.bed) ? params.bed : lastEntry && beds.byId.has(lastEntry.bedId) ? lastEntry.bedId : beds.beds[0]?.id ?? "";
    setDraft({ bedId, liters: "", method: lastEntry && lastEntry.method !== "rain" ? lastEntry.method : "manual", duration: "", date: params.date ?? todayISO(), notes: "" });
    setDialogOpen(true);
  }, [beds, lastEntry]);
  const openAddPlain = useCallback(() => openAdd(), [openAdd]);
  useOpenAddOnNavigate(openAddPlain);
  useAddFromUrl(openAdd);

  const openEdit = (e: WaterEntry) => {
    setEditingId(e.id);
    setSubmitted(false);
    setDraft({
      bedId: e.bedId, liters: e.liters.toLocaleString(locale, { useGrouping: false }), method: e.method,
      duration: e.duration ? String(e.duration) : "", date: toISODate(e.date) || todayISO(), notes: e.notes ?? "",
    });
    setDialogOpen(true);
  };

  const litersNum = num(draft.liters);
  const durationNum = draft.duration.trim() ? Math.round(num(draft.duration)) : 0;
  const errors = {
    bed: submitted && !draft.bedId ? t("water.needBed") : undefined,
    liters: (submitted || draft.liters.trim()) && !(litersNum > 0) ? t("water.needLiters") : undefined,
    duration: !(durationNum >= 0) ? t("water.invalidNumber") : undefined,
  };

  const handleSave = () => {
    setSubmitted(true);
    const bed = beds.byId.get(draft.bedId);
    if (!bed || !(litersNum > 0) || errors.duration) return;
    const fields = {
      bedId: bed.id, gardenId: bed.gardenId, date: draft.date, liters: litersNum, method: draft.method,
      duration: durationNum || undefined, notes: draft.notes.trim() || undefined,
    };
    if (editingId) {
      updateWaterEntry(editingId, fields);
      toast(t("water.updated"), "success");
    } else {
      addWaterEntry(fields);
      const added = useStore.getState().waterEntries.at(-1);
      toast(t("water.saved", { bed: bed.label, amount: formatVolume(litersNum) }), "success", {
        action: added ? { label: t("common.undo"), onClick: () => deleteWaterEntry(added.id) } : undefined,
      });
    }
    setDialogOpen(false);
  };

  const handleDelete = async (e: WaterEntry) => {
    if (!(await confirm(t("common.confirmDelete"), { confirmLabel: t("common.delete") }))) return;
    deleteWaterEntry(e.id);
    setDialogOpen(false);
    const { id: _id, ...rest } = e;
    toast(t("water.deleted"), "success", { action: { label: t("common.undo"), onClick: () => addWaterEntry(rest) } });
  };

  // ---------------------------------------------------------------- aggregates
  const data = useMemo(() => {
    const now = new Date();
    const thisWeek = weekStart(now);
    const thisMonth = startOfMonth(now);
    let week = 0, weekRain = 0, month = 0;
    const firstChartWeek = subWeeks(thisWeek, CHART_WEEKS - 1);
    const perWeek = new Map<number, { water: number; rain: number }>();
    for (let i = 0; i < CHART_WEEKS; i++) perWeek.set(addWeeks(firstChartWeek, i).getTime(), { water: 0, rain: 0 });
    const groups = new Map<number, WaterEntry[]>();
    for (const e of waterEntries) {
      const d = toDate(e.date);
      if (!d) continue;
      const ws = weekStart(d).getTime();
      const rain = e.method === "rain";
      if (ws === thisWeek.getTime()) { if (rain) weekRain += e.liters; else week += e.liters; }
      if (d >= thisMonth && !rain) month += e.liters;
      const bucket = perWeek.get(ws);
      if (bucket) { if (rain) bucket.rain += e.liters; else bucket.water += e.liters; }
      groups.set(ws, [...(groups.get(ws) ?? []), e]);
    }
    const chart = [...perWeek.entries()].map(([ws, v]) => ({ ws: new Date(ws), ...v }));
    const avg = chart.reduce((s, w) => s + w.water, 0) / CHART_WEEKS;
    const weeks = [...groups.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([ws, entries]) => [new Date(ws), entries.sort((a, b) => b.date.localeCompare(a.date))] as const);
    return { week, weekRain, month, avg, chart, weeks };
  }, [waterEntries]);

  const [weeksShown, setWeeksShown] = useState(4);
  const editing = editingId ? waterEntries.find((e) => e.id === editingId) : undefined;
  const weekRange = (ws: Date) => `${formatDate(ws)} – ${formatDate(endOfWeek(ws, { weekStartsOn: 1 }))}`;

  return (
    <div>
      <PageHeader
        title={t("water.title")}
        description={t("water.subtitle")}
        actions={
          <Button onClick={openAddPlain} disabled={beds.beds.length === 0}>
            <Plus size={16} aria-hidden="true" />
            {t("water.add")}
          </Button>
        }
      />

      {waterEntries.length === 0 ? (
        <Card>
          <EmptyState
            icon={Droplets}
            title={t("water.emptyTitle")}
            description={beds.beds.length ? t("water.emptyText") : t("water.emptyNoBeds")}
            action={beds.beds.length
              ? <Button onClick={openAddPlain}><Plus size={16} aria-hidden="true" />{t("water.add")}</Button>
              : <Button onClick={() => navigate("/planner")}>{t("importPage.toPlanner")}</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={t("water.thisWeek")} value={formatVolume(data.week)} icon={Droplets} tone="info" hint={data.weekRain ? t("water.plusRain", { amount: formatVolume(data.weekRain) }) : undefined} />
            <StatCard label={t("water.thisMonth")} value={formatVolume(data.month)} />
            <StatCard label={t("water.avgPerWeek")} value={formatVolume(data.avg)} hint={t("water.lastWeeks", { count: CHART_WEEKS })} />
            <StatCard label={t("water.entriesStat")} value={formatNumber(waterEntries.length)} />
          </div>

          <Card>
            <CardHeader title={t("water.perWeek")} description={t("water.perWeekHint", { count: CHART_WEEKS })} />
            <BarChart
              caption={t("water.perWeek")}
              categoryLabel={t("water.week")}
              series={[
                { label: t("water.irrigation"), color: "sky" },
                { label: t("water.methods.rain"), color: "muted" },
              ]}
              data={data.chart.map((w) => ({
                key: String(w.ws.getTime()),
                label: t("water.weekShort", { week: getISOWeek(w.ws) }),
                fullLabel: `${t("water.weekShort", { week: getISOWeek(w.ws) })} · ${weekRange(w.ws)}`,
                values: [w.water, w.rain],
              }))}
              formatValue={formatVolume}
            />
          </Card>

          <section className="space-y-4" aria-label={t("water.log")}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t("water.log")}</h2>
            {data.weeks.slice(0, weeksShown).map(([ws, entries]) => {
              const total = entries.filter((e) => e.method !== "rain").reduce((s, e) => s + e.liters, 0);
              return (
                <List
                  key={ws.getTime()}
                  header={
                    <span className="flex items-center justify-between gap-2">
                      <span>{t("water.weekShort", { week: getISOWeek(ws) })} · {weekRange(ws)}</span>
                      <span className="font-medium tabular-nums">{formatVolume(total)}</span>
                    </span>
                  }
                >
                  {entries.map((e) => {
                    const rain = e.method === "rain";
                    const Icon = rain ? CloudRain : Droplets;
                    return (
                      <ListRow
                        key={e.id}
                        onClick={() => openEdit(e)}
                        leading={<span className="inline-flex size-8 items-center justify-center rounded-lg bg-info/10 text-info"><Icon size={16} aria-hidden="true" /></span>}
                        title={beds.label(e.bedId) ?? t("water.unknownBed")}
                        meta={
                          <>
                            {t(`water.methods.${e.method}`)}
                            {e.duration ? ` · ${t("water.minutesCount", { count: e.duration })}` : ""}
                            {" · "}
                            <time dateTime={toISODate(e.date)}>{formatDate(e.date, "relative")}</time>
                          </>
                        }
                        description={e.notes}
                        trailing={formatVolume(e.liters)}
                        actions={
                          <Menu
                            label={t("common.moreActions")}
                            items={[
                              { label: t("common.edit"), icon: Pencil, onSelect: () => openEdit(e) },
                              "separator",
                              { label: t("common.delete"), icon: Trash2, danger: true, onSelect: () => void handleDelete(e) },
                            ]}
                          />
                        }
                      />
                    );
                  })}
                </List>
              );
            })}
            {data.weeks.length > weeksShown && (
              <Button variant="secondary" onClick={() => setWeeksShown((n) => n + 4)}>{t("water.showOlder")}</Button>
            )}
          </section>
        </div>
      )}

      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingId ? t("water.edit") : t("water.add")}
        footer={
          <>
            {editing && (
              <Button variant="danger-ghost" className="mr-auto" onClick={() => void handleDelete(editing)}>
                <Trash2 size={16} aria-hidden="true" />{t("common.delete")}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave}>{editingId ? t("common.save") : t("common.add")}</Button>
          </>
        }
      >
        <div className="space-y-5">
          <Select label={t("planner.bed")} value={draft.bedId} onChange={(e) => patch({ bedId: e.target.value })} options={beds.options} error={errors.bed} />
          <div>
            <Input label={t("water.litersLabel")} inputMode="decimal" value={draft.liters} onChange={(e) => patch({ liters: e.target.value })} placeholder="10" error={errors.liters} autoFocus />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_LITERS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => patch({ liters: String(l) })}
                  className="inline-flex min-h-9 items-center rounded-full bg-gray-100 px-3 text-sm font-medium text-gray-700 hover:bg-gray-200 sm:min-h-8 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15"
                >
                  {formatVolume(l)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label={t("water.method")} value={draft.method} onChange={(e) => patch({ method: e.target.value as Method })} options={METHODS.map((m) => ({ value: m, label: t(`water.methods.${m}`) }))} />
            <Input label={t("water.durationLabel")} inputMode="numeric" value={draft.duration} onChange={(e) => patch({ duration: e.target.value })} placeholder="15" hint={t("common.optional")} error={errors.duration} />
          </div>
          <DateField label={t("harvest.date")} value={draft.date} onChange={(date) => patch({ date })} />
          <Textarea label={t("harvest.notes")} rows={2} value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
