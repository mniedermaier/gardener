import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlaskConical, Package, Pencil, Plus, ShoppingCart, Sprout, Trash2 } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { useOpenAddParamsOnNavigate } from "@/hooks/useOpenAddOnNavigate";
import { needsNewStock, propagation, seedViability, type Viability } from "@/lib/seedViability";
import type { SeedItem, SeedSource, SeedUnit } from "@/types/seed";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, focusFirstInvalid } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Menu } from "@/components/ui/Menu";
import { List, ListRow } from "@/components/ui/List";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { KeyFigures } from "@/components/ui/charts";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast, useConfirmDelete } from "@/components/ui/Toast";
import { PlantCombobox } from "@/components/records/PlantCombobox";
import { useAddFromUrl, type AddParams } from "@/components/records/useAddFromUrl";

const CURRENT_YEAR = new Date().getFullYear();
const UNITS: SeedUnit[] = ["packets", "grams", "seeds"];
const SOURCES: SeedSource[] = ["shop", "saved", "traded", "gifted"];

type Filter = "all" | "test";

interface Draft {
  plantId: string;
  variety: string;
  quantity: string;
  unit: SeedUnit;
  year: string;
  source: SeedSource;
  shopName: string;
  cost: string;
  notes: string;
}

const emptyDraft = (plantId = ""): Draft => ({
  plantId, variety: "", quantity: "1", unit: "packets", year: String(CURRENT_YEAR), source: "shop", shopName: "", cost: "", notes: "",
});

const num = (s: string) => Number(s.trim().replace(",", "."));

export function SeedInventory() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirmDelete = useConfirmDelete();
  const { formatCurrency, formatNumber, locale } = useFormat();
  const { seeds, gardens, addSeed, updateSeed, deleteSeed } = useStore(
    useShallow((s) => ({ seeds: s.seeds, gardens: s.gardens, addSeed: s.addSeed, updateSeed: s.updateSeed, deleteSeed: s.deleteSeed })),
  );
  const plants = usePlants();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();

  const [filter, setFilter] = useState<Filter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const openAdd = useCallback((params: AddParams = {}) => {
    setEditingId(null);
    setSubmitted(false);
    const plantId = params.plant && plantMap.has(params.plant) ? params.plant : "";
    setDraft({ ...emptyDraft(plantId), ...(propagation(plantMap.get(plantId)) === "vegetative" ? { unit: "grams" as const } : {}) });
    setDialogOpen(true);
  }, [plantMap]);
  const openAddPlain = useCallback(() => openAdd(), [openAdd]);
  useOpenAddParamsOnNavigate(openAdd);
  useAddFromUrl(openAdd);

  const openEdit = (s: SeedItem) => {
    setEditingId(s.id);
    setSubmitted(false);
    setDraft({
      plantId: s.plantId, variety: s.variety ?? "", quantity: String(s.quantity), unit: s.unit, year: String(s.yearAcquired),
      source: s.source, shopName: s.shopName ?? "", cost: s.cost != null ? s.cost.toLocaleString(locale, { useGrouping: false }) : "", notes: s.notes ?? "",
    });
    setDialogOpen(true);
  };

  // Annual crops in the beds without any seed or planting stock in the inventory.
  // Perennials (rosemary, thyme, berries…) are already in the ground.
  const missing = useMemo(() => {
    const planted = new Set<string>();
    for (const g of gardens) for (const b of g.beds) for (const c of b.cells) planted.add(c.plantId);
    const stocked = new Set(seeds.map((s) => s.plantId));
    return [...planted]
      .filter((id) => !stocked.has(id) && needsNewStock(plantMap.get(id)))
      .sort((a, b) => getPlantName(a).localeCompare(getPlantName(b)));
  }, [gardens, seeds, plantMap, getPlantName]);

  const rows = useMemo(
    () => seeds
      .map((s) => ({ seed: s, viability: seedViability(plantMap.get(s.plantId), s.yearAcquired, CURRENT_YEAR) }))
      .sort((a, b) => getPlantName(a.seed.plantId).localeCompare(getPlantName(b.seed.plantId)) || (a.seed.variety ?? "").localeCompare(b.seed.variety ?? "")),
    [seeds, plantMap, getPlantName],
  );
  const testCount = rows.filter((r) => r.viability.status === "testRecommended").length;
  const shown = filter === "test" ? rows.filter((r) => r.viability.status === "testRecommended") : rows;
  const totalCost = seeds.reduce((s, seed) => s + (seed.cost ?? 0), 0);

  const quantityNum = num(draft.quantity);
  const yearNum = Math.round(num(draft.year));
  const costNum = draft.cost.trim() ? num(draft.cost) : 0;
  const errors = {
    plant: submitted && !draft.plantId ? t("seeds.needPlant") : undefined,
    quantity: !Number.isFinite(quantityNum) || quantityNum < 0 ? t("seeds.invalidNumber") : undefined,
    year: !Number.isFinite(yearNum) || yearNum < 1950 || yearNum > CURRENT_YEAR + 1 ? t("seeds.invalidYear") : undefined,
    cost: !Number.isFinite(costNum) || costNum < 0 ? t("seeds.invalidNumber") : undefined,
  };

  const handleSave = () => {
    setSubmitted(true);
    if (!draft.plantId || errors.quantity || errors.year || errors.cost) { focusFirstInvalid(); return; }
    const fields = {
      plantId: draft.plantId,
      variety: draft.variety.trim() || undefined,
      quantity: quantityNum,
      unit: draft.unit,
      yearAcquired: yearNum,
      source: draft.source,
      shopName: draft.source === "shop" ? draft.shopName.trim() || undefined : undefined,
      cost: costNum || undefined,
      notes: draft.notes.trim() || undefined,
    };
    if (editingId) {
      updateSeed(editingId, fields);
      toast(t("seeds.updated"), "success");
    } else {
      addSeed(fields);
      toast(t("seeds.added"), "success");
    }
    setDialogOpen(false);
  };

  const handleDelete = async (seed: SeedItem) => {
    const what = [getPlantName(seed.plantId), seed.variety?.trim(), String(seed.yearAcquired)].filter(Boolean).join(" · ");
    if (!(await confirmDelete("seed", what))) return;
    deleteSeed(seed.id);
    setDialogOpen(false);
    const { id: _id, ...rest } = seed;
    toast(t("seeds.deleted"), "success", { action: { label: t("common.undo"), onClick: () => addSeed(rest) } });
  };

  const statusBadge = (v: Viability) => {
    switch (v.status) {
      case "notApplicable":
        return <Badge variant="outline" icon={Sprout}>{t("seeds.plantingStock")}</Badge>;
      case "testRecommended":
        return <Badge tone="warning" icon={FlaskConical}>{t("seeds.testRecommended")}</Badge>;
      case "lastYear":
        return <Badge tone="warning" dot>{t("seeds.yearsLeft", { count: v.yearsLeft })}</Badge>;
      default:
        return <Badge tone="positive" dot>{t("seeds.yearsLeft", { count: v.yearsLeft })}</Badge>;
    }
  };

  const yearsText = (count: number) => t("seeds.years", { count });
  const editing = editingId ? seeds.find((s) => s.id === editingId) : undefined;
  const draftPlant = draft.plantId ? plantMap.get(draft.plantId) : undefined;
  const draftVegetative = propagation(draftPlant) === "vegetative";

  return (
    <div>
      <PageHeader
        title={t("seeds.title")}
        description={t("seeds.subtitle")}
        actions={
          <Button onClick={openAddPlain}>
            <Plus size={16} aria-hidden="true" />
            {t("seeds.add")}
          </Button>
        }
      />

      {seeds.length > 0 && (
        <KeyFigures
          className="mb-6"
          // The shopping gap is what the page is about; with nothing missing
          // the stock itself leads. Zero counts are left out.
          hero={missing.length > 0
            ? { label: t("seeds.missingStat"), value: formatNumber(missing.length), hint: t("seeds.missingStatHint"), icon: ShoppingCart, tone: "info" }
            : { label: t("seeds.items"), value: formatNumber(seeds.length), icon: Package, tone: "brand" }}
          items={[
            ...(missing.length > 0 ? [{ label: t("seeds.items"), value: formatNumber(seeds.length) }] : []),
            ...(testCount > 0 ? [{ label: t("seeds.testRecommended"), value: formatNumber(testCount), hint: t("seeds.testHintShort") }] : []),
            ...(totalCost > 0 ? [{ label: t("seeds.totalCost"), value: formatCurrency(totalCost) }] : []),
          ]}
        />
      )}

      {missing.length > 0 && (
        <Card className="mb-6">
          <CardHeader title={t("seeds.shoppingList")} description={t("seeds.shoppingListHint")} />
          <div className="flex flex-wrap gap-2">
            {missing.map((id) => {
              const plant = plantMap.get(id);
              if (!plant) return null;
              const vegetative = propagation(plant) === "vegetative";
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => openAdd({ plant: id })}
                  aria-label={t("seeds.addFor", { name: getPlantName(id) })}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-gray-200 bg-white py-1 pr-3 pl-1.5 text-sm font-medium text-gray-800 hover:border-garden-500 hover:bg-garden-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-garden-500/15"
                >
                  <PlantIconDisplay plantId={id} emoji={plant.icon} size={22} />
                  {getPlantName(id)}
                  {vegetative && <span className="text-xs font-normal text-gray-500 dark:text-gray-400">· {t("seeds.plantingStock")}</span>}
                  {id === "onion" && <span className="text-xs font-normal text-gray-500 dark:text-gray-400">· {t("seeds.orOnionSets")}</span>}
                  <Plus size={14} aria-hidden="true" className="text-gray-500" />
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {seeds.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title={t("seeds.emptyTitle")}
            description={t("seeds.emptyText")}
            action={<Button onClick={openAddPlain}><Plus size={16} aria-hidden="true" />{t("seeds.add")}</Button>}
          />
        </Card>
      ) : (
        <>
          {testCount > 0 && (
            <SegmentedControl
              className="mb-4"
              label={t("seeds.filterLabel")}
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: t("common.all"), count: rows.length },
                { value: "test", label: t("seeds.testRecommended"), count: testCount },
              ]}
            />
          )}
          <List label={t("seeds.title")}>
            {shown.map(({ seed, viability }) => {
              const plant = plantMap.get(seed.plantId);
              const name = getPlantName(seed.plantId);
              const sourceText = seed.source === "shop" && seed.shopName ? seed.shopName : t(`seeds.sources.${seed.source}`);
              return (
                <ListRow
                  key={seed.id}
                  onClick={() => openEdit(seed)}
                  clickLabel={seed.variety ? `${name} ${seed.variety}` : name}
                  leading={plant ? <PlantIconDisplay plantId={seed.plantId} emoji={plant.icon} size={28} /> : <Package size={20} aria-hidden="true" className="text-gray-500" />}
                  title={
                    <>
                      {name}
                      {seed.variety && <span className="font-normal text-gray-500 dark:text-gray-400"> · {seed.variety}</span>}
                    </>
                  }
                  badges={statusBadge(viability)}
                  meta={[
                    t(`seeds.unitCount.${seed.unit}`, { count: seed.quantity, n: formatNumber(seed.quantity) }),
                    sourceText,
                    t("seeds.acquired", { year: seed.yearAcquired }),
                  ].join(" · ")}
                  description={
                    viability.status === "testRecommended"
                      ? t("seeds.testExplain", { name, years: yearsText(viability.viabilityYears) })
                      : viability.status === "notApplicable"
                        ? t("seeds.plantingStockExplain")
                        : seed.notes
                  }
                  trailing={seed.cost ? formatCurrency(seed.cost) : undefined}
                  actions={
                    <Menu
                      label={t("common.moreActions")}
                      items={[
                        { label: t("common.edit"), icon: Pencil, onSelect: () => openEdit(seed) },
                        "separator",
                        { label: t("common.delete"), icon: Trash2, danger: true, onSelect: () => void handleDelete(seed) },
                      ]}
                    />
                  }
                />
              );
            })}
          </List>
        </>
      )}

      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingId ? t("seeds.edit") : t("seeds.add")}
        footer={
          <>
            {editing && (
              <Button variant="danger-ghost" className="mr-auto" onClick={() => void handleDelete(editing)}>
                <Trash2 size={16} aria-hidden="true" />
                {t("common.delete")}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave}>{editingId ? t("common.save") : t("common.add")}</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <PlantCombobox
              label={t("harvest.plant")}
              plants={plants}
              value={draft.plantId}
              autoFocus={!draft.plantId}
              invalid={Boolean(errors.plant)}
              onChange={({ plantId }) => patch({ plantId, ...(propagation(plantMap.get(plantId)) === "vegetative" && draft.unit !== "grams" ? { unit: "grams" as const } : {}) })}
              hint={draftVegetative ? t("seeds.vegetativeHint", { name: getPlantName(draft.plantId) }) : undefined}
            />
            {errors.plant && <p className="mt-1 text-xs font-medium text-danger">{errors.plant}</p>}
          </div>
          <Input label={t("planner.variety")} value={draft.variety} onChange={(e) => patch({ variety: e.target.value })} placeholder={t("planner.varietyPlaceholder")} />
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Input label={t("seeds.quantity")} inputMode="decimal" value={draft.quantity} onChange={(e) => patch({ quantity: e.target.value })} error={errors.quantity} />
            <div>
              <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300" aria-hidden="true">{t("seeds.unit")}</p>
              <SegmentedControl
                fullWidth
                label={t("seeds.unit")}
                value={draft.unit}
                onChange={(unit) => patch({ unit })}
                options={UNITS.map((u) => ({ value: u, label: t(`seeds.units.${u}`) }))}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t("seeds.year")} inputMode="numeric" value={draft.year} onChange={(e) => patch({ year: e.target.value })} error={errors.year} />
            <Select
              label={t("seeds.source")}
              value={draft.source}
              onChange={(e) => patch({ source: e.target.value as SeedSource })}
              options={SOURCES.map((s) => ({ value: s, label: t(`seeds.sources.${s}`) }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {draft.source === "shop" && (
              <Input label={t("seeds.shopName")} value={draft.shopName} onChange={(e) => patch({ shopName: e.target.value })} placeholder={t("seeds.shopPlaceholder")} />
            )}
            <Input
              label={t("seeds.cost")}
              inputMode="decimal"
              value={draft.cost}
              onChange={(e) => patch({ cost: e.target.value })}
              placeholder={formatCurrency(3.5)}
              hint={t("common.optional")}
              error={errors.cost}
            />
          </div>
          <Textarea label={t("harvest.notes")} rows={2} value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
