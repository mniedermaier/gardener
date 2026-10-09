import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bird, Egg, Droplet, Plus, Coins } from "lucide-react";
import { endOfWeek, startOfWeek } from "date-fns";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { useFormat } from "@/hooks/useFormat";
import { useOpenAddOnNavigate } from "@/hooks/useOpenAddOnNavigate";
import { todayISO, toISODate } from "@/lib/format";
import { getActualProducts, getFeedCostStats, type ProductTotals } from "@/lib/metrics";
import { EGG_LAYERS, type Animal } from "@/types/animal";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { AnimalCard } from "./AnimalCard";
import { ProductionChart } from "./ProductionChart";
import { AnimalDialog, animalLabel, herdSummary } from "./shared";
import { useToday } from "@/hooks/useToday";

const QUICK_EGGS = [1, 2, 3, 5, 10];

export function LivestockPage() {
  const now = useToday();
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();
  const { toast, confirm } = useToast();
  const { animals, animalProducts, feedEntries, healthEvents, addProduct, deleteProduct, deleteAnimal, restoreAnimal } = useStore(
    useShallow((s) => ({
      animals: s.animals, animalProducts: s.animalProducts, feedEntries: s.feedEntries, healthEvents: s.healthEvents,
      addProduct: s.addProduct, deleteProduct: s.deleteProduct, deleteAnimal: s.deleteAnimal, restoreAnimal: s.restoreAnimal,
    })),
  );

  const [dialog, setDialog] = useState<{ open: boolean; animal?: Animal }>({ open: false });
  const openAdd = useCallback(() => setDialog({ open: true }), []);
  useOpenAddOnNavigate(openAdd);

  const year = now.getFullYear();
  const today = todayISO();
  const eggAnimal = animals.find((a) => EGG_LAYERS.includes(a.type));

  const stats = useMemo(() => {
    const ws = toISODate(startOfWeek(now, { weekStartsOn: 1 }));
    const we = toISODate(endOfWeek(now, { weekStartsOn: 1 }));
    const eggs = animalProducts.filter((p) => p.type === "eggs");
    return {
      eggsToday: eggs.filter((p) => p.date === today).reduce((s, p) => s + p.quantity, 0),
      eggsWeek: eggs.filter((p) => p.date >= ws && p.date <= we).reduce((s, p) => s + p.quantity, 0),
      year: getActualProducts(animalProducts, year),
      feed: getFeedCostStats(feedEntries, now),
    };
  }, [now, animalProducts, feedEntries, today, year]);

  const perAnimal = useMemo(() => {
    const map = new Map<string, { recorded: Partial<ProductTotals>; feedCost: number; lastHealth?: (typeof healthEvents)[number] }>();
    for (const a of animals) {
      const recorded = getActualProducts(animalProducts.filter((p) => p.animalId === a.id), year);
      const feedCost = feedEntries.filter((e) => e.animalId === a.id).reduce((s, e) => s + (e.cost ?? 0), 0);
      const lastHealth = healthEvents.filter((h) => h.animalId === a.id).sort((x, y) => y.date.localeCompare(x.date))[0];
      map.set(a.id, { recorded, feedCost, lastHealth });
    }
    return map;
  }, [animals, animalProducts, feedEntries, healthEvents, year]);

  const quickEggs = (n: number) => {
    if (!eggAnimal) return;
    addProduct({ animalId: eggAnimal.id, type: "eggs", date: today, quantity: n, unit: "pieces" });
    toast(t("livestock.eggsLogged", { count: n }), "success", {
      action: {
        label: t("common.undo"),
        onClick: () => {
          const last = useStore.getState().animalProducts.findLast((p) => p.animalId === eggAnimal.id && p.type === "eggs" && p.date === today && p.quantity === n);
          if (last) deleteProduct(last.id);
        },
      },
    });
  };

  const removeAnimal = async (animal: Animal) => {
    if (!(await confirm(t("livestock.confirmDeleteAnimal"), { confirmLabel: t("common.delete") }))) return;
    const snapshot = {
      animal,
      products: animalProducts.filter((p) => p.animalId === animal.id),
      feeds: feedEntries.filter((e) => e.animalId === animal.id),
      health: healthEvents.filter((h) => h.animalId === animal.id),
    };
    deleteAnimal(animal.id);
    toast(t("livestock.deleted", { name: animalLabel(animal, t) }), "success", { action: { label: t("common.undo"), onClick: () => restoreAnimal(snapshot) } });
  };

  const addButton = (
    <Button onClick={openAdd}>
      <Plus size={16} aria-hidden="true" />
      {t("livestock.addAnimal")}
    </Button>
  );

  return (
    <div>
      <PageHeader
        title={t("livestock.title")}
        description={animals.length > 0 ? herdSummary(animals, t) : t("livestock.subtitle")}
        actions={animals.length > 0 ? addButton : undefined}
      />

      {animals.length === 0 ? (
        <Card>
          <EmptyState icon={Bird} title={t("livestock.emptyTitle")} description={t("livestock.emptyText")} action={addButton} />
        </Card>
      ) : (
        <div className="space-y-6">
          {eggAnimal && (
            <Card padding="sm" className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <Egg size={18} aria-hidden="true" className="text-gray-500 dark:text-gray-400" />
                <div>
                  <p id="quick-eggs-label" className="text-sm font-medium text-gray-900 dark:text-gray-100">{t("livestock.quickEggs")}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("livestock.eggsSoFarToday", { count: stats.eggsToday })} · {animalLabel(eggAnimal, t)}
                  </p>
                </div>
              </div>
              <div role="group" aria-labelledby="quick-eggs-label" className="flex flex-wrap gap-1.5 sm:ml-auto">
                {QUICK_EGGS.map((n) => (
                  <Button key={n} variant="secondary" size="sm" className="min-h-11 min-w-11 tabular-nums sm:min-h-9" onClick={() => quickEggs(n)} aria-label={t("livestock.addEggs", { count: n })}>
                    +{n}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={t("livestock.eggsThisWeek")} value={f.formatNumber(stats.eggsWeek, { maximumFractionDigits: 0 })} icon={Egg} tone="neutral" />
            <StatCard label={t("livestock.eggsThisYear")} value={f.formatNumber(stats.year.eggs, { maximumFractionDigits: 0 })} icon={Egg} tone="neutral" />
            <StatCard label={t("livestock.honeyThisYear")} value={f.formatWeight(stats.year.honey * 1000)} icon={Droplet} tone="neutral" />
            <StatCard
              label={t("livestock.feedCost30")}
              value={f.formatCurrency(stats.feed.last30Days)}
              icon={Coins}
              tone="neutral"
              hint={stats.feed.total > 0 ? t("livestock.feedPerMonthHint", { amount: f.formatCurrency(stats.feed.perMonth) }) : t("livestock.feedEntriesCount", { count: 0 })}
            />
          </div>

          <Card>
            <CardHeader title={t("livestock.chartTitle")} description={t("livestock.chartDesc")} />
            <ProductionChart animalProducts={animalProducts} />
          </Card>

          <section aria-labelledby="herd-heading">
            <h2 id="herd-heading" className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">{t("livestock.herd")}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {animals.map((animal) => {
                const d = perAnimal.get(animal.id);
                return (
                  <AnimalCard
                    key={animal.id}
                    animal={animal}
                    recorded={d?.recorded ?? {}}
                    feedCost={d?.feedCost ?? 0}
                    lastHealth={d?.lastHealth}
                    onOpen={() => navigate(`/livestock/${animal.id}`)}
                    onEdit={() => setDialog({ open: true, animal })}
                    onDelete={() => void removeAnimal(animal)}
                  />
                );
              })}
            </div>
          </section>
        </div>
      )}

      <AnimalDialog open={dialog.open} animal={dialog.animal} onClose={() => setDialog({ open: false })} />
    </div>
  );
}
