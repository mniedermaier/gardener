import { useCallback, useMemo, useState } from "react";
import { EggWeekHint } from "./EggWeekHint";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bird, Egg, Plus, Coins } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { useFormat } from "@/hooks/useFormat";
import { useOpenAddOnNavigate } from "@/hooks/useOpenAddOnNavigate";
import { todayISO } from "@/lib/format";
import { expectationStart, getActualProducts, getFeedCostStats, type ProductTotals } from "@/lib/metrics";
import { EGG_LAYERS, type Animal } from "@/types/animal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { KeyFigures, Sparkline } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast, useConfirmDelete } from "@/components/ui/Toast";
import { AnimalCard } from "./AnimalCard";
import { AnimalDialog, animalLabel, formatProductAmount, herdSummary } from "./shared";
import { herdProductTypes, weeklyEggs } from "./productFigures";
import { useToday } from "@/hooks/useToday";

const QUICK_EGGS = [1, 2, 3, 5, 10];

export function LivestockPage() {
  const now = useToday();
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();
  const { toast } = useToast();
  const confirmDelete = useConfirmDelete();
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
    const eggs = animalProducts.filter((p) => p.type === "eggs");
    const eggWeeks = weeklyEggs(animalProducts, now);
    return {
      eggsToday: eggs.filter((p) => p.date === today).reduce((s, p) => s + p.quantity, 0),
      // Last 7 days (the newest rolling window), not the calendar week.
      eggsWeek: eggWeeks[eggWeeks.length - 1],
      year: getActualProducts(animalProducts, year),
      feed: getFeedCostStats(feedEntries, now),
      eggWeeks,
    };
  }, [now, animalProducts, feedEntries, today, year]);

  // Key figures only for what this herd yields (no "Honig 0 kg" without bees).
  const herdTypes = herdProductTypes(animals, stats.year).slice(0, eggAnimal ? 2 : 3);
  const eggAvg = stats.eggWeeks.reduce((s, n) => s + n, 0) / stats.eggWeeks.length;
  const lastEggEntry = animalProducts.reduce<string | null>((max, p) => (p.type === "eggs" && (max === null || p.date > max) ? p.date : max), null);
  const feedFigure = {
    label: t("livestock.feedCost30"),
    value: f.formatCurrency(stats.feed.last30Days),
    hint: stats.feed.total > 0 ? t("livestock.feedPerMonthHint", { amount: f.formatCurrency(stats.feed.perMonth) }) : t("livestock.feedEntriesCount", { count: 0 }),
    to: "/livestock/feed",
  };

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
    if (!(await confirmDelete("animal", animalLabel(animal, t), t("livestock.confirmDeleteAnimal")))) return;
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
                    {stats.eggsToday === 0 ? t("livestock.noEggsToday") : t("livestock.eggsSoFarToday", { count: stats.eggsToday })} · {animalLabel(eggAnimal, t)}
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

          <KeyFigures
            hero={eggAnimal ? {
              label: t("livestock.eggsThisWeek"),
              value: f.formatNumber(stats.eggsWeek, { maximumFractionDigits: 0 }),
              icon: Egg,
              visual: <Sparkline values={stats.eggWeeks} color="brand" width={160} height={32} label={t("livestock.eggWeeksLabel", { avg: f.formatNumber(eggAvg, { maximumFractionDigits: 0 }) })} />,
              hint: <EggWeekHint week={stats.eggsWeek} avg={eggAvg} lastEntry={lastEggEntry} />,
              to: "/livestock/production",
            } : { ...feedFigure, icon: Coins }}
            // A short summary that links on: the year totals and the monthly
            // chart live on "Produktion", so this page does not repeat them.
            items={[
              ...herdTypes.filter((ty) => ty !== "eggs").map((ty) => ({
                label: t("livestock.productThisYear", { product: t(`livestock.products.${ty}`) }),
                value: formatProductAmount(ty, stats.year[ty], f, t),
                hint: t("livestock.entriesHint", { count: animalProducts.filter((p) => p.type === ty && p.date.startsWith(String(year))).length }),
                to: "/livestock/production",
              })),
              ...(eggAnimal ? [feedFigure] : []),
            ].slice(-2)}
          />

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
                    expectedFrom={expectationStart(animal, animalProducts)}
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
