import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bird, Droplet, Egg, Milk, Pencil, Plus, Trash2 } from "lucide-react";
import { endOfWeek, startOfWeek } from "date-fns";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { useFormat } from "@/hooks/useFormat";
import { useOpenAddOnNavigate } from "@/hooks/useOpenAddOnNavigate";
import { toISODate } from "@/lib/format";
import { getActualProducts } from "@/lib/metrics";
import type { AnimalProduct, ProductType } from "@/types/animal";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Select } from "@/components/ui/Select";
import { List, ListRow } from "@/components/ui/List";
import { Menu } from "@/components/ui/Menu";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductionChart } from "./ProductionChart";
import { PRODUCT_ICON } from "./icons";
import { IconTile, ProductDialog, animalLabel, formatProductAmount, useRecordActions } from "./shared";
import { groupByMonth } from "./groupByMonth";

export function ProductionPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();
  const { deleteProduct } = useRecordActions();
  const { animals, animalProducts } = useStore(useShallow((s) => ({ animals: s.animals, animalProducts: s.animalProducts })));

  const [filterAnimalId, setFilterAnimalId] = useState("");
  const [filterType, setFilterType] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; entry?: AnimalProduct }>({ open: false });
  const openAdd = useCallback(() => setDialog({ open: true }), []);
  useOpenAddOnNavigate(openAdd);

  const animalMap = useMemo(() => new Map(animals.map((a) => [a.id, a])), [animals]);
  const filtered = useMemo(
    () => animalProducts
      .filter((p) => (!filterAnimalId || p.animalId === filterAnimalId) && (!filterType || p.type === filterType))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [animalProducts, filterAnimalId, filterType],
  );

  const year = new Date().getFullYear();
  const stats = useMemo(() => {
    const now = new Date();
    const ws = toISODate(startOfWeek(now, { weekStartsOn: 1 }));
    const we = toISODate(endOfWeek(now, { weekStartsOn: 1 }));
    return {
      eggsWeek: animalProducts.filter((p) => p.type === "eggs" && p.date >= ws && p.date <= we).reduce((s, p) => s + p.quantity, 0),
      year: getActualProducts(animalProducts, year),
    };
  }, [animalProducts, year]);

  const productTypes = [...new Set(animalProducts.map((p) => p.type))] as ProductType[];
  const groups = groupByMonth(filtered);

  const addButton = (
    <Button onClick={openAdd} disabled={animals.length === 0}>
      <Plus size={16} aria-hidden="true" />
      {t("livestock.addProduct")}
    </Button>
  );

  return (
    <div>
      <PageHeader title={t("livestock.production.title")} description={t("livestock.production.subtitle")} actions={animals.length > 0 ? addButton : undefined} />

      {animals.length === 0 ? (
        <Card>
          <EmptyState icon={Bird} title={t("livestock.emptyTitle")} description={t("livestock.emptyText")} action={<Button onClick={() => navigate("/livestock")}>{t("livestock.toHerd")}</Button>} />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={t("livestock.eggsThisWeek")} value={f.formatNumber(stats.eggsWeek, { maximumFractionDigits: 0 })} icon={Egg} tone="neutral" />
            <StatCard label={t("livestock.eggsThisYear")} value={f.formatNumber(stats.year.eggs, { maximumFractionDigits: 0 })} icon={Egg} tone="neutral" />
            <StatCard label={t("livestock.honeyThisYear")} value={f.formatWeight(stats.year.honey * 1000)} icon={Droplet} tone="neutral" />
            <StatCard label={t("livestock.milkThisYear")} value={f.formatVolume(stats.year.milk)} icon={Milk} tone="neutral" />
          </div>

          {animalProducts.length > 0 && (
            <Card>
              <CardHeader title={t("livestock.chartTitle")} description={t("livestock.chartDesc12")} />
              <ProductionChart animalProducts={animalProducts} months={12} />
            </Card>
          )}

          {animalProducts.length === 0 ? (
            <Card>
              <EmptyState icon={Egg} title={t("livestock.noProductsTitle")} description={t("livestock.noProducts")} action={addButton} />
            </Card>
          ) : (
            <section className="space-y-3">
              {(animals.length > 1 || productTypes.length > 1) && (
                <div className="grid gap-3 sm:max-w-lg sm:grid-cols-2">
                  {animals.length > 1 && (
                    <Select label={t("livestock.filterAnimal")} value={filterAnimalId} onChange={(e) => setFilterAnimalId(e.target.value)} placeholder={t("livestock.allAnimals")} options={animals.map((a) => ({ value: a.id, label: animalLabel(a, t) }))} />
                  )}
                  {productTypes.length > 1 && (
                    <Select label={t("livestock.filterProduct")} value={filterType} onChange={(e) => setFilterType(e.target.value)} placeholder={t("livestock.production.allProducts")} options={productTypes.map((ty) => ({ value: ty, label: t(`livestock.products.${ty}`) }))} />
                  )}
                </div>
              )}
              {groups.length === 0 ? (
                <Card><p className="text-center text-sm text-gray-500 dark:text-gray-400">{t("livestock.emptyFilter")}</p></Card>
              ) : groups.map((g) => (
                <List key={g.key} header={`${f.formatDate(g.date, "monthYear")} · ${t("livestock.entriesHint", { count: g.items.length })}`}>
                  {g.items.map((p) => {
                    const animal = animalMap.get(p.animalId);
                    return (
                      <ListRow
                        key={p.id}
                        leading={<IconTile icon={PRODUCT_ICON[p.type]} />}
                        title={t(`livestock.products.${p.type}`)}
                        meta={[animal ? animalLabel(animal, t) : null, f.formatDate(p.date, "relative")].filter(Boolean).join(" · ")}
                        description={p.notes}
                        trailing={formatProductAmount(p.type, p.unit === "g" ? p.quantity / 1000 : p.quantity, f, t)}
                        onClick={() => setDialog({ open: true, entry: p })}
                        actions={
                          <Menu
                            label={t("common.moreActions")}
                            items={[
                              { label: t("common.edit"), icon: Pencil, onSelect: () => setDialog({ open: true, entry: p }) },
                              ...(animal ? [{ label: t("livestock.openAnimal"), icon: Bird, onSelect: () => navigate(`/livestock/${animal.id}`) }] : []),
                              "separator" as const,
                              { label: t("common.delete"), icon: Trash2, danger: true, onSelect: () => void deleteProduct(p) },
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

      <ProductDialog open={dialog.open} entry={dialog.entry} onClose={() => setDialog({ open: false })} />
    </div>
  );
}
