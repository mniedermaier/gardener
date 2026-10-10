import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bird, Pencil, Plus, Trash2, Wheat } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { useFormat } from "@/hooks/useFormat";
import { useOpenAddOnNavigate } from "@/hooks/useOpenAddOnNavigate";
import { getFeedCostStats } from "@/lib/metrics";
import type { FeedEntry } from "@/types/animal";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { List, ListRow } from "@/components/ui/List";
import { Menu } from "@/components/ui/Menu";
import { EmptyState } from "@/components/ui/EmptyState";
import { KeyFigures, Meter } from "@/components/ui/charts";
import { ANIMAL_ICON } from "./icons";
import { FeedDialog, IconTile, NoAnimalsYet, animalLabel, formatFeedAmount, useRecordActions } from "./shared";
import { groupByMonth } from "./groupByMonth";

export function FeedPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();
  const { deleteFeed } = useRecordActions();
  const { animals, feedEntries } = useStore(useShallow((s) => ({ animals: s.animals, feedEntries: s.feedEntries })));

  const [filterAnimalId, setFilterAnimalId] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; entry?: FeedEntry }>({ open: false });
  // No animal yet (quick add from anywhere): add one first instead of an unsavable dialog.
  const openAdd = useCallback(() => {
    if (animals.length === 0) { navigate("/livestock", { state: { openAdd: true } }); return; }
    setDialog({ open: true });
  }, [animals.length, navigate]);
  useOpenAddOnNavigate(openAdd);

  const animalMap = useMemo(() => new Map(animals.map((a) => [a.id, a])), [animals]);
  const filtered = useMemo(
    () => feedEntries.filter((e) => !filterAnimalId || e.animalId === filterAnimalId).sort((a, b) => b.date.localeCompare(a.date)),
    [feedEntries, filterAnimalId],
  );

  const stats = useMemo(() => {
    const perAnimal = new Map<string, number>();
    for (const e of feedEntries) perAnimal.set(e.animalId, (perAnimal.get(e.animalId) ?? 0) + (e.cost ?? 0));
    return {
      ...getFeedCostStats(feedEntries),
      totalKg: feedEntries.reduce((s, e) => s + (e.unit === "kg" ? e.quantity : e.unit === "g" ? e.quantity / 1000 : 0), 0),
      // Litres (sugar water, milk replacer) cannot join the kilograms; named separately instead of dropped.
      totalLiters: feedEntries.reduce((s, e) => s + (e.unit === "liters" ? e.quantity : 0), 0),
      perAnimal: [...perAnimal.entries()].filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]),
    };
  }, [feedEntries]);

  const groups = groupByMonth(filtered);
  const addButton = (
    <Button onClick={openAdd}>
      <Plus size={16} aria-hidden="true" />
      {t("livestock.addFeed")}
    </Button>
  );

  return (
    <div>
      <PageHeader title={t("livestock.feed.title")} description={t("livestock.feed.subtitle")} actions={animals.length > 0 ? addButton : undefined} />

      {animals.length === 0 ? (
        <NoAnimalsYet icon={Wheat} title={t("livestock.feed.emptyTitle")} text={t("livestock.feed.emptyText")} />
      ) : feedEntries.length === 0 ? (
        <Card>
          <EmptyState icon={Wheat} title={t("livestock.noFeedTitle")} description={t("livestock.noFeed")} action={addButton} />
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Nothing in the last 30 days: a 0,00 € hero says nothing — the monthly
              average leads, and the 30-day figure moves into the row. */}
          <KeyFigures
            hero={stats.entriesLast30Days > 0 ? {
              label: t("livestock.feedCost30"),
              value: f.formatCurrency(stats.last30Days),
              icon: Wheat,
              hint: t("livestock.feedEntriesCount", { count: stats.entriesLast30Days }),
            } : {
              label: t("livestock.feed.perMonth"),
              value: f.formatCurrency(stats.perMonth),
              icon: Wheat,
              hint: stats.since ? t("livestock.feed.perMonthSince", { date: f.formatDate(stats.since) }) : undefined,
            }}
            items={[
              stats.entriesLast30Days > 0
                ? { label: t("livestock.feed.perMonth"), value: f.formatCurrency(stats.perMonth), hint: stats.since ? t("livestock.feed.perMonthSince", { date: f.formatDate(stats.since) }) : undefined }
                : { label: t("livestock.feedCost30"), value: f.formatCurrency(0), hint: t("livestock.feedEntriesCount", { count: 0 }) },
              { label: t("livestock.feed.totalCost"), value: f.formatCurrency(stats.total) },
              {
                label: t("livestock.feed.totalKg"),
                value: f.formatWeight(stats.totalKg * 1000),
                hint: stats.totalLiters > 0 ? t("livestock.feed.plusLiquid", { volume: f.formatVolume(stats.totalLiters) }) : undefined,
              },
            ]}
          />

          {stats.perAnimal.length > 1 && (
            <Card>
              <CardHeader title={t("livestock.feed.perAnimal")} />
              <ul className="space-y-3">
                {stats.perAnimal.map(([id, cost]) => {
                  const animal = animalMap.get(id);
                  if (!animal) return null;
                  const Icon = ANIMAL_ICON[animal.type];
                  const share = stats.total > 0 ? cost / stats.total : 0;
                  return (
                    <li key={id}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                          <Icon size={14} aria-hidden="true" className="text-gray-500" />
                          {animalLabel(animal, t)}
                        </span>
                        <span className="tabular-nums text-gray-600 dark:text-gray-300">
                          {f.formatCurrency(cost)} <span className="text-gray-500 dark:text-gray-400">· {f.formatPercent(share)}</span>
                        </span>
                      </div>
                      <Meter actual={cost} max={stats.total} color="muted" label={`${animalLabel(animal, t)}: ${f.formatCurrency(cost)}`} />
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <section className="space-y-3">
            {/* Same list header as Produktion and Gesundheit: heading left, filter right. */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t("livestock.production.entries")}</h2>
              {animals.length > 1 && (
                <Select aria-label={t("livestock.filterAnimal")} wrapperClassName="w-full sm:w-48" value={filterAnimalId} onChange={(e) => setFilterAnimalId(e.target.value)} placeholder={t("livestock.allAnimals")} options={animals.map((a) => ({ value: a.id, label: animalLabel(a, t) }))} />
              )}
            </div>
            {groups.length === 0 ? (
              <Card><p className="text-center text-sm text-gray-500 dark:text-gray-400">{t("livestock.emptyFilter")}</p></Card>
            ) : groups.map((g) => (
              <List
                key={g.key}
                // Month total right-aligned, the same pattern as Ernte, Bewässerung and Kosten.
                header={
                  <span className="flex items-center justify-between gap-2">
                    <span>{f.formatDate(g.date, "monthYear")}</span>
                    <span className="font-medium tabular-nums">{f.formatCurrency(g.items.reduce((s, e) => s + (e.cost ?? 0), 0))}</span>
                  </span>
                }
              >
                {g.items.map((e) => {
                  const animal = animalMap.get(e.animalId);
                  return (
                    <ListRow
                      key={e.id}
                      leading={<IconTile icon={Wheat} />}
                      title={e.feedType}
                      meta={[formatFeedAmount(e, f), animal ? animalLabel(animal, t) : null, f.formatDate(e.date, "relative")]}
                      description={e.notes}
                      trailing={e.cost !== undefined ? f.formatCurrency(e.cost) : undefined}
                      onClick={() => setDialog({ open: true, entry: e })}
                      actions={
                        <Menu
                          label={t("common.moreActions")}
                          items={[
                            { label: t("common.edit"), icon: Pencil, onSelect: () => setDialog({ open: true, entry: e }) },
                            ...(animal ? [{ label: t("livestock.openAnimal"), icon: Bird, onSelect: () => navigate(`/livestock/${animal.id}`) }] : []),
                            "separator" as const,
                            { label: t("common.delete"), icon: Trash2, danger: true, onSelect: () => void deleteFeed(e) },
                          ]}
                        />
                      }
                    />
                  );
                })}
              </List>
            ))}
          </section>
        </div>
      )}

      <FeedDialog open={dialog.open} entry={dialog.entry} onClose={() => setDialog({ open: false })} />
    </div>
  );
}
