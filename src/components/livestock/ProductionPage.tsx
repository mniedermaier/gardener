import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bird, Egg, Pencil, Plus, Trash2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { useFormat } from "@/hooks/useFormat";
import { useOpenAddOnNavigate } from "@/hooks/useOpenAddOnNavigate";
import { expectationStart, expectedShareToDate, getActualProducts } from "@/lib/metrics";
import { ANNUAL_YIELD, EGG_LAYERS, type AnimalProduct, type ProductType } from "@/types/animal";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { KeyFigures, Sparkline } from "@/components/ui/charts";
import { Select } from "@/components/ui/Select";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Menu } from "@/components/ui/Menu";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductionChart } from "./ProductionChart";
import { PRODUCT_ICON } from "./icons";
import { NoAnimalsYet, ProductDialog, animalLabel, formatProductAmount, useRecordActions } from "./shared";
import { ProductWeekList } from "./ProductWeekList";
import { herdProductTypes, weeklyEggs } from "./productFigures";
import { useToday } from "@/hooks/useToday";

export function ProductionPage() {
  const now = useToday();
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

  const year = now.getFullYear();
  const stats = useMemo(() => {
    const eggWeeks = weeklyEggs(animalProducts, now);
    return {
      // Last 7 days (the newest rolling window), not the calendar week.
      eggsWeek: eggWeeks[eggWeeks.length - 1],
      year: getActualProducts(animalProducts, year),
      eggWeeks,
    };
  }, [now, animalProducts, year]);

  // Only products this herd yields (or that were recorded): no "Milch 0 l" without goats.
  const herdTypes = herdProductTypes(animals, stats.year);
  const hasLayers = animals.some((a) => EGG_LAYERS.includes(a.type));
  const yearFigure = (ty: ProductType) => ({
    label: ty === "eggs" ? t("livestock.eggsThisYear") : t("livestock.productThisYear", { product: t(`livestock.products.${ty}`) }),
    value: formatProductAmount(ty, stats.year[ty], f, t),
  });
  const eggWeeks = stats.eggWeeks;
  const eggAvg = eggWeeks.reduce((s, n) => s + n, 0) / eggWeeks.length;
  // Same basis as the herd cards on "Tiere": expected up to today since arrival or the first entry.
  const expectedToDate = (ty: ProductType) => animals.reduce((sum, a) => {
    const y = ANNUAL_YIELD[a.type]?.find((x) => x.product === ty);
    return y ? sum + y.quantity * a.count * expectedShareToDate(ty, now, expectationStart(a, animalProducts)) : sum;
  }, 0);
  // "Tiere" leads with this week; this page is the record: the year so far
  // against what the herd should have yielded by now, then the week.
  const heroType = herdTypes[0];
  const heroExpected = heroType ? expectedToDate(heroType) : 0;
  const heroFigure = heroType
    ? {
        ...yearFigure(heroType),
        icon: PRODUCT_ICON[heroType],
        hint: heroExpected > 0
          ? t("livestock.production.yearHint", { amount: heroType === "eggs" ? f.formatNumber(heroExpected, { maximumFractionDigits: 0 }) : formatProductAmount(heroType, heroExpected, f, t) })
          : undefined,
      }
    : null;
  const weekFigure = hasLayers
    ? [{
        label: t("livestock.eggsThisWeek"),
        value: (
          <span className="inline-flex items-end gap-3">
            {f.formatNumber(stats.eggsWeek, { maximumFractionDigits: 0 })}
            <Sparkline values={eggWeeks} color="earth" width={72} height={22} label={t("livestock.eggWeeksLabel", { avg: f.formatNumber(eggAvg, { maximumFractionDigits: 0 }) })} />
          </span>
        ),
        hint: t("livestock.eggWeeksAvg", { avg: f.formatNumber(eggAvg, { maximumFractionDigits: 0 }) }),
      }]
    : [];
  const yearFigures = [...weekFigure, ...herdTypes.slice(1).map(yearFigure)];

  const productTypes = [...new Set(animalProducts.map((p) => p.type))] as ProductType[];

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
        <NoAnimalsYet icon={Egg} title={t("livestock.production.emptyTitle")} text={t("livestock.production.emptyText")} />
      ) : (
        <div className="space-y-6">
          {heroFigure && <KeyFigures hero={heroFigure} items={yearFigures.slice(0, 3)} />}

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
              {/* Filters sit in the list header instead of a row of their own. */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t("livestock.production.entries")}</h2>
                {(animals.length > 1 || productTypes.length > 1) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {productTypes.length > 1 && (
                      <SegmentedControl
                        inline
                        label={t("livestock.filterProduct")}
                        value={filterType}
                        onChange={setFilterType}
                        options={[{ value: "", label: t("common.all") }, ...productTypes.map((ty) => ({ value: ty as string, label: t(`livestock.products.${ty}`) }))]}
                      />
                    )}
                    {animals.length > 1 && (
                      <Select aria-label={t("livestock.filterAnimal")} wrapperClassName="w-full sm:w-48" value={filterAnimalId} onChange={(e) => setFilterAnimalId(e.target.value)} placeholder={t("livestock.allAnimals")} options={animals.map((a) => ({ value: a.id, label: animalLabel(a, t) }))} />
                    )}
                  </div>
                )}
              </div>
              {filtered.length === 0 ? (
                <Card><p className="text-center text-sm text-gray-500 dark:text-gray-400">{t("livestock.emptyFilter")}</p></Card>
              ) : (
                <ProductWeekList
                  products={filtered}
                  entryMeta={(p) => { const animal = animalMap.get(p.animalId); return animal && animals.length > 1 ? animalLabel(animal, t) : null; }}
                  onOpen={(p) => setDialog({ open: true, entry: p })}
                  renderActions={(p) => {
                    const animal = animalMap.get(p.animalId);
                    return (
                      <Menu
                        label={t("common.moreActions")}
                        items={[
                          { label: t("common.edit"), icon: Pencil, onSelect: () => setDialog({ open: true, entry: p }) },
                          ...(animal ? [{ label: t("livestock.openAnimal"), icon: Bird, onSelect: () => navigate(`/livestock/${animal.id}`) }] : []),
                          "separator" as const,
                          { label: t("common.delete"), icon: Trash2, danger: true, onSelect: () => void deleteProduct(p) },
                        ]}
                      />
                    );
                  }}
                />
              )}
            </section>
          )}
        </div>
      )}

      <ProductDialog open={dialog.open} entry={dialog.entry} onClose={() => setDialog({ open: false })} />
    </div>
  );
}
