import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle, Archive, Check, CookingPot, FlaskRound, Lightbulb, Package, Pencil, Plus, RotateCcw, Snowflake, Sun, Trash2, Warehouse, type LucideIcon,
} from "lucide-react";
import { addMonths, differenceInCalendarDays } from "date-fns";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { useOpenAddParamsOnNavigate } from "@/hooks/useOpenAddOnNavigate";
import { toDate, toISODate, todayISO } from "@/lib/format";
import type { PreservationMethod } from "@/types/plant";
import type { PantryItem, PantryUnit } from "@/types/pantry";
import { SHELF_LIFE_MONTHS, PRESERVATION_YIELD, PLANT_PRESERVATION_GUIDES, PANTRY_UNITS } from "@/types/pantry";
import { resolvePantryUnit } from "@/lib/pantryUnits";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, focusFirstInvalid } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { Menu } from "@/components/ui/Menu";
import { List, ListRow } from "@/components/ui/List";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { KeyFigures } from "@/components/ui/charts";
import { Tabs } from "@/components/ui/Tabs";
import { LABEL_CLASS } from "@/components/ui/Field";
import { useToast, useConfirmDelete } from "@/components/ui/Toast";
import { DateField } from "@/components/ui/DateField";
import { PlantCombobox } from "@/components/records/PlantCombobox";
import { useAddFromUrl, type AddParams } from "@/components/records/useAddFromUrl";
import { useToday } from "@/hooks/useToday";

const METHODS: PreservationMethod[] = ["canning", "freezing", "fermenting", "drying", "root_cellar"];
const METHOD_ICON: Record<PreservationMethod, LucideIcon> = {
  canning: CookingPot, freezing: Snowflake, fermenting: FlaskRound, drying: Sun, root_cellar: Warehouse,
};
const SOON_DAYS = 30;
/** Suggested container per method; the user can pick another one. */
const DEFAULT_UNIT: Record<PreservationMethod, PantryUnit> = {
  canning: "jar", freezing: "bag", fermenting: "jar", drying: "jar", root_cellar: "piece",
};

type Tab = "stock" | "consumed" | "guides";

interface Draft {
  plantId: string;
  method: PreservationMethod;
  quantity: string;
  units: string;
  unitKind: PantryUnit;
  /** Free text for unitKind "other". */
  unitLabel: string;
  date: string;
  label: string;
  notes: string;
  supplyCost: string;
}

const emptyDraft = (plantId = "", method: PreservationMethod = "freezing"): Draft => ({
  plantId, method, quantity: "", units: "", unitKind: DEFAULT_UNIT[method], unitLabel: "", date: todayISO(), label: "", notes: "", supplyCost: "",
});
const num = (s: string) => Number(s.trim().replace(",", "."));

function MethodIcon({ method }: { method: PreservationMethod }) {
  const Icon = METHOD_ICON[method];
  return <Icon size={12} aria-hidden="true" className="shrink-0" />;
}

/** Radio cards for the preservation method (icon + name), arrow keys move. */
function MethodPicker({ label, value, options, onChange }: { label: string; value: PreservationMethod; options: PreservationMethod[]; onChange: (m: PreservationMethod) => void }) {
  const { t } = useTranslation();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + options.length) % options.length;
    onChange(options[next]);
    refs.current[next]?.focus();
  };
  return (
    <div>
      <p className={LABEL_CLASS}>{label}</p>
      {/* Same tile as the planner and livestock pickers (icon inline); three columns
          everywhere, so five methods fill two rows without a lone tile. */}
      <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-2">
        {options.map((m, i) => {
          const Icon = METHOD_ICON[m];
          const selected = m === value;
          return (
            <button
              key={m}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(m)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`flex min-h-11 min-w-0 items-center gap-1.5 rounded-lg border px-2 py-2 text-left text-xs leading-tight font-medium transition-colors sm:gap-2 sm:px-3 sm:text-sm ${
                selected
                  ? "border-garden-600 bg-garden-50 text-garden-800 dark:border-garden-400 dark:bg-garden-500/15 dark:text-garden-200"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
              }`}
            >
              <Icon size={16} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 break-words hyphens-auto">{t(`preservation.methods.${m}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PantryPage() {
  const now = useToday();
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirmDelete = useConfirmDelete();
  const { formatDate, formatWeight, formatNumber, formatPercent, locale } = useFormat();
  const { pantryItems, addPantryItem, updatePantryItem, deletePantryItem, consumePantryItem } = useStore(
    useShallow((s) => ({
      pantryItems: s.pantryItems, addPantryItem: s.addPantryItem, updatePantryItem: s.updatePantryItem,
      deletePantryItem: s.deletePantryItem, consumePantryItem: s.consumePantryItem,
    })),
  );
  const plants = usePlants();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();

  const [tab, setTab] = useState<Tab>("stock");
  const [filterMethod, setFilterMethod] = useState<string>("");

  // ---------------------------------------------------------------- dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  /** "5 Gläser", "1 Glas"; free-text units stay as entered. */
  const unitText = (count: number, item: Pick<PantryItem, "unitKind" | "unitLabel">) => {
    const unit = resolvePantryUnit(item);
    return `${formatNumber(count)} ${unit.kind === "other" ? unit.label ?? "" : t(`pantry.unitNames.${unit.kind}`, { count })}`.trim();
  };

  const preservable = useMemo(() => plants.filter((p) => (p.preservationMethods?.length ?? 0) > 0 || PLANT_PRESERVATION_GUIDES[p.id]), [plants]);
  const methodsFor = useCallback(
    (plantId: string): PreservationMethod[] => (plantId ? PLANT_PRESERVATION_GUIDES[plantId] ?? plantMap.get(plantId)?.preservationMethods ?? METHODS : METHODS),
    [plantMap],
  );

  const openAdd = useCallback((params: AddParams = {}) => {
    const plantId = params.plant && plantMap.has(params.plant) ? params.plant : "";
    setEditingId(null);
    setSubmitted(false);
    setDraft(emptyDraft(plantId, plantId ? methodsFor(plantId)[0] : "freezing"));
    setDialogOpen(true);
  }, [plantMap, methodsFor]);
  const openAddPlain = useCallback(() => openAdd(), [openAdd]);
  useOpenAddParamsOnNavigate(openAdd);
  useAddFromUrl(openAdd);

  const local = (n: number) => n.toLocaleString(locale, { useGrouping: false, maximumFractionDigits: 2 });
  const openEdit = (item: PantryItem) => {
    setEditingId(item.id);
    setSubmitted(false);
    setDraft({
      plantId: item.plantId, method: item.method, quantity: local(item.quantityKg), units: item.units ? String(item.units) : "",
      ...(() => { const u = resolvePantryUnit(item); return { unitKind: u.kind, unitLabel: u.label ?? "" }; })(),
      date: item.date, label: item.label ?? "", notes: item.notes ?? "",
      supplyCost: item.supplyCost ? local(item.supplyCost) : "",
    });
    setDialogOpen(true);
  };

  const quantityNum = num(draft.quantity);
  const unitsNum = draft.units.trim() ? Math.round(num(draft.units)) : 0;
  const costNum = draft.supplyCost.trim() ? num(draft.supplyCost) : 0;
  const expiresDate = toISODate(addMonths(toDate(draft.date) ?? now, SHELF_LIFE_MONTHS[draft.method]));
  const errors = {
    plant: submitted && !draft.plantId ? t("pantry.needPlant") : undefined,
    quantity: (submitted || draft.quantity.trim()) && !(quantityNum > 0) ? t("pantry.needQuantity") : undefined,
    units: !(unitsNum >= 0) ? t("pantry.invalidNumber") : undefined,
    cost: !(costNum >= 0) ? t("pantry.invalidNumber") : undefined,
  };

  const canSave = Boolean(draft.plantId) && quantityNum > 0 && !errors.units && !errors.cost;

  const handleSave = () => {
    setSubmitted(true);
    if (!draft.plantId || !(quantityNum > 0) || errors.units || errors.cost) { focusFirstInvalid(); return; }
    const fields = {
      plantId: draft.plantId, method: draft.method, quantityKg: quantityNum,
      units: unitsNum || undefined,
      unitKind: unitsNum ? draft.unitKind : undefined,
      unitLabel: unitsNum && draft.unitKind === "other" ? draft.unitLabel.trim() || undefined : undefined,
      date: draft.date, expiresDate, label: draft.label.trim() || undefined, notes: draft.notes.trim() || undefined,
      supplyCost: costNum || undefined,
    };
    if (editingId) {
      updatePantryItem(editingId, fields);
      toast(t("pantry.updated"), "success");
    } else {
      addPantryItem({ ...fields, consumed: false });
      toast(t("pantry.added"), "success");
    }
    setDialogOpen(false);
  };

  const handleConsume = (item: PantryItem) => {
    consumePantryItem(item.id);
    toast(t("pantry.consumedToast", { name: item.label || getPlantName(item.plantId) }), "success", {
      action: { label: t("common.undo"), onClick: () => updatePantryItem(item.id, { consumed: false, consumedDate: undefined }) },
    });
  };

  const handleDelete = async (item: PantryItem) => {
    const what = [item.label?.trim() || getPlantName(item.plantId), item.units ? unitText(item.units, item) : formatWeight(item.quantityKg * 1000)].filter(Boolean).join(" · ");
    if (!(await confirmDelete("pantry", what))) return;
    deletePantryItem(item.id);
    setDialogOpen(false);
    const { id: _id, ...rest } = item;
    toast(t("pantry.deleted"), "success", { action: { label: t("common.undo"), onClick: () => addPantryItem(rest) } });
  };

  // ---------------------------------------------------------------- data
  const today = now;
  const daysLeft = useCallback((item: PantryItem) => differenceInCalendarDays(toDate(item.expiresDate) ?? today, today), [today]);
  const active = useMemo(() => pantryItems.filter((p) => !p.consumed), [pantryItems]);
  const consumed = useMemo(
    () => pantryItems.filter((p) => p.consumed).sort((a, b) => (b.consumedDate ?? "").localeCompare(a.consumedDate ?? "")),
    [pantryItems],
  );
  const stats = useMemo(() => {
    const kg = active.reduce((s, p) => s + p.quantityKg, 0);
    const soon = active.filter((p) => { const d = daysLeft(p); return d >= 0 && d <= SOON_DAYS; }).length;
    const expired = active.filter((p) => daysLeft(p) < 0).length;
    const methods = new Set(active.map((p) => p.method)).size;
    return { kg, soon, expired, methods };
  }, [active, daysLeft]);
  const stock = useMemo(
    () => active.filter((p) => !filterMethod || p.method === filterMethod).sort((a, b) => a.expiresDate.localeCompare(b.expiresDate)),
    [active, filterMethod],
  );

  const stockEmpty = tab === "stock" && active.length === 0;
  const editing = editingId ? pantryItems.find((p) => p.id === editingId) : undefined;
  const draftMethods = methodsFor(draft.plantId);
  const shelfText = t("pantry.monthsCount", { count: SHELF_LIFE_MONTHS[draft.method] });

  const methodBadge = (m: PreservationMethod) => <Badge variant="outline" icon={METHOD_ICON[m]}>{t(`preservation.methods.${m}`)}</Badge>;

  return (
    <div>
      <PageHeader
        title={t("pantry.title")}
        description={t("pantry.subtitle")}
        // While the empty state offers "Vorrat hinzufügen", the header does not repeat it.
        actions={stockEmpty ? undefined : (
          <Button onClick={openAddPlain}>
            <Plus size={16} aria-hidden="true" />
            {t("pantry.add")}
          </Button>
        )}
        tabs={
          <Tabs
            label={t("pantry.title")}
            value={tab}
            onChange={setTab}
            items={[
              // No "0" counters: a count only where there is something.
              { value: "stock", label: t("pantry.stockTab"), count: active.length || undefined },
              { value: "consumed", label: t("pantry.consumed"), count: consumed.length || undefined },
              { value: "guides", label: t("pantry.guidesTab") },
            ]}
          />
        }
      />

      {tab === "stock" && (
        active.length === 0 ? (
          <Card>
            <EmptyState
              icon={Archive}
              title={t("pantry.emptyTitle")}
              description={t("pantry.emptyText")}
              action={<Button onClick={openAddPlain}><Plus size={16} aria-hidden="true" />{t("pantry.add")}</Button>}
            />
          </Card>
        ) : (
          <div className="space-y-6">
            <KeyFigures
              hero={{ label: t("pantry.totalStored"), value: formatWeight(stats.kg * 1000), icon: Archive, tone: "brand" }}
              // Only figures that say something: no "Abgelaufen 0".
              items={[
                // Items, not a sum of jars + bags + pieces (which would mean nothing).
                { label: t("pantry.totalItems"), value: formatNumber(active.length), hint: t("pantry.methodsHint", { count: stats.methods }) },
                ...(stats.soon > 0 ? [{ label: t("pantry.expiringSoon"), value: formatNumber(stats.soon), hint: t("pantry.withinDays", { count: SOON_DAYS }) }] : []),
                ...(stats.expired > 0 ? [{ label: t("pantry.expired"), value: formatNumber(stats.expired) }] : []),
              ]}
            />

            {stats.expired > 0 && (
              <div role="status" className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-gray-800 dark:text-gray-200">
                <AlertTriangle size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-danger" />
                {t("pantry.expiredWarning", { count: stats.expired })}
              </div>
            )}

            <section className="space-y-3">
              {/* Same list header as the livestock records: heading left, filter right. */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t("pantry.itemsHeading")}</h2>
                {active.length > 3 && (
                  <Select
                    aria-label={t("pantry.method")}
                    wrapperClassName="w-full sm:w-48"
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                    placeholder={t("pantry.allMethods")}
                    options={METHODS.map((m) => ({ value: m, label: t(`preservation.methods.${m}`) }))}
                  />
                )}
              </div>
              {stock.length === 0 ? (
                <Card><p className="text-center text-sm text-gray-500 dark:text-gray-400">{t("pantry.emptyFilter")}</p></Card>
              ) : (
                <List label={t("pantry.stockTab")}>
                  {stock.map((item) => {
                    const plant = plantMap.get(item.plantId);
                    const d = daysLeft(item);
                    return (
                      <ListRow
                        key={item.id}
                        onClick={() => openEdit(item)}
                        leading={plant ? <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={28} /> : <Package size={20} aria-hidden="true" className="text-gray-500" />}
                        title={item.label || getPlantName(item.plantId)}
                        badges={
                          d < 0 ? <Badge tone="danger" dot>{t("pantry.expiredBadge")}</Badge>
                            : d <= SOON_DAYS ? <Badge tone="warning" dot>{t("pantry.daysLeft", { count: d })}</Badge>
                              : undefined
                        }
                        meta={[
                          <span key="m" className="inline-flex items-center gap-1 align-top">
                            <MethodIcon method={item.method} />
                            {t(`preservation.methods.${item.method}`)}
                          </span>,
                          item.units ? unitText(item.units, item) : null,
                          <span key="e" className="whitespace-nowrap">{t("pantry.expiresOn")} <time dateTime={item.expiresDate}>{formatDate(item.expiresDate)}</time></span>,
                        ]}
                        description={item.notes}
                        trailing={formatWeight(item.quantityKg * 1000)}
                        // Only the weight trails; "Verbraucht" lives in the menu so the meta keeps its width.
                        actions={
                          <Menu
                            label={t("common.moreActions")}
                            items={[
                              { label: t("pantry.markConsumed"), icon: Check, onSelect: () => handleConsume(item) },
                              { label: t("common.edit"), icon: Pencil, onSelect: () => openEdit(item) },
                              "separator",
                              { label: t("common.delete"), icon: Trash2, danger: true, onSelect: () => void handleDelete(item) },
                            ]}
                          />
                        }
                      />
                    );
                  })}
                </List>
              )}
            </section>
          </div>
        )
      )}

      {tab === "consumed" && (
        consumed.length === 0 ? (
          <Card><EmptyState compact icon={Check} title={t("pantry.noConsumed")} description={t("pantry.noConsumedText")} /></Card>
        ) : (
          <List label={t("pantry.consumed")}>
            {consumed.map((item) => {
              const plant = plantMap.get(item.plantId);
              return (
                <ListRow
                  key={item.id}
                  muted
                  onClick={() => openEdit(item)}
                  leading={plant ? <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={28} /> : <Package size={20} aria-hidden="true" className="text-gray-500" />}
                  title={item.label || getPlantName(item.plantId)}
                  badges={methodBadge(item.method)}
                  meta={item.consumedDate ? <>{t("pantry.consumedOn")} <time dateTime={item.consumedDate}>{formatDate(item.consumedDate, "relativeInline")}</time></> : undefined}
                  trailing={formatWeight(item.quantityKg * 1000)}
                  actions={
                    <Menu
                      label={t("common.moreActions")}
                      items={[
                        { label: t("pantry.restore"), icon: RotateCcw, onSelect: () => updatePantryItem(item.id, { consumed: false, consumedDate: undefined }) },
                        "separator",
                        { label: t("common.delete"), icon: Trash2, danger: true, onSelect: () => void handleDelete(item) },
                      ]}
                    />
                  }
                />
              );
            })}
          </List>
        )
      )}

      {tab === "guides" && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {METHODS.map((m) => {
              const Icon = METHOD_ICON[m];
              return (
                <Card key={m} padding="sm">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-9 items-center justify-center rounded-lg bg-garden-50 text-garden-700 dark:bg-garden-500/15 dark:text-garden-300" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t(`preservation.methods.${m}`)}</h3>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t(`pantry.methodInfo.${m}.desc`)}</p>
                  <dl className="mt-3 flex gap-6 text-xs">
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">{t("pantry.shelfLife")}</dt>
                      <dd className="font-medium text-gray-900 dark:text-gray-100">{t("pantry.monthsCount", { count: SHELF_LIFE_MONTHS[m] })}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">{t("pantry.yield")}</dt>
                      <dd className="font-medium text-gray-900 dark:text-gray-100">{t("pantry.about", { value: formatPercent(PRESERVATION_YIELD[m]) })}</dd>
                    </div>
                  </dl>
                </Card>
              );
            })}
          </div>

          <List header={t("pantry.plantGuides")}>
            {preservable.map((plant) => {
              const methods = methodsFor(plant.id);
              return (
                <ListRow
                  key={plant.id}
                  leading={<PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={28} />}
                  title={getPlantName(plant.id)}
                  meta={<span className="mt-1 flex flex-wrap gap-1">{methods.map((m) => <span key={m}>{methodBadge(m)}</span>)}</span>}
                  actions={<IconButton icon={Plus} label={t("pantry.addFor", { name: getPlantName(plant.id) })} onClick={() => openAdd({ plant: plant.id })} />}
                />
              );
            })}
          </List>

          <Card>
            <CardHeader title={t("pantry.tipsTitle")} />
            <ul className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <li key={n} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <Lightbulb size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-garden-600 dark:text-garden-400" />
                  <span>{t(`pantry.tip${n}`)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingId ? t("pantry.edit") : t("pantry.add")}
        footer={
          <>
            {editing && (
              <Button variant="danger-ghost" className="mr-auto" onClick={() => void handleDelete(editing)}>
                <Trash2 size={16} aria-hidden="true" />{t("common.delete")}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={!canSave}>{t("common.save")}</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <PlantCombobox
              label={t("harvest.plant")}
              plants={preservable}
              value={draft.plantId}
              autoFocus={!draft.plantId}
              invalid={Boolean(errors.plant)}
              onChange={({ plantId }) => {
                const ms = methodsFor(plantId);
                patch({ plantId, method: ms.includes(draft.method) ? draft.method : ms[0] });
              }}
            />
            {errors.plant && <p className="mt-1 text-xs font-medium text-danger">{errors.plant}</p>}
          </div>
          <Input label={t("pantry.label")} optional value={draft.label} onChange={(e) => patch({ label: e.target.value })} placeholder={t("pantry.labelPlaceholder")} />
          {/* The methods depend on the crop: shown (and preselected) once a plant is chosen,
              so no shelf life is promised for nothing. */}
          {draft.plantId && (
            <div>
              <MethodPicker label={t("pantry.method")} value={draft.method} options={draftMethods} onChange={(method) => patch({ method, unitKind: draft.unitKind === DEFAULT_UNIT[draft.method] ? DEFAULT_UNIT[method] : draft.unitKind })} />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                {t("pantry.methodSummary", { shelf: shelfText, date: formatDate(expiresDate, "short"), yield: formatPercent(PRESERVATION_YIELD[draft.method]) })}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 items-end gap-4">
            <Input label={t("pantry.quantityKg")} inputMode="decimal" value={draft.quantity} onChange={(e) => patch({ quantity: e.target.value })} placeholder={t("common.examplePlaceholder", { value: formatNumber(1.5) })} error={errors.quantity} />
            <Input label={t("pantry.unitCount")} optional inputMode="numeric" value={draft.units} onChange={(e) => patch({ units: e.target.value })} placeholder={t("common.examplePlaceholder", { value: formatNumber(5, { maximumFractionDigits: 0 }) })} error={errors.units} />
          </div>
          {unitsNum > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <Select
                label={t("pantry.unitLabel")}
                value={draft.unitKind}
                onChange={(e) => patch({ unitKind: e.target.value as PantryUnit })}
                options={[...PANTRY_UNITS, "other" as const].map((k) => ({
                  value: k,
                  label: k === "other" ? t("pantry.unitOther") : t(`pantry.unitNames.${k}`, { count: unitsNum }),
                }))}
              />
              {draft.unitKind === "other" && (
                <Input label={t("pantry.unitOtherLabel")} value={draft.unitLabel} onChange={(e) => patch({ unitLabel: e.target.value })} placeholder={t("pantry.unitLabelPlaceholder")} />
              )}
            </div>
          )}
          <Input label={t("pantry.supplyCost")} optional inputMode="decimal" value={draft.supplyCost} onChange={(e) => patch({ supplyCost: e.target.value })} placeholder={t("common.examplePlaceholder", { value: formatNumber(4, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })} hint={t("common.costHint")} error={errors.cost} />
          {/* Rule 9: amounts and costs, then the date, then the free text. */}
          <DateField label={t("pantry.storedDate")} value={draft.date} onChange={(date) => patch({ date })} />
          <Textarea label={t("harvest.notes")} optional placeholder={t("pantry.notesPlaceholder")} rows={2} value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
