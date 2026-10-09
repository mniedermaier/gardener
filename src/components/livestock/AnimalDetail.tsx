import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, BookOpen, HeartPulse, Pencil, Plus, Scale, Trash2, Wheat, Egg } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { useAnalysisPrefs } from "@/store/analysisPrefs";
import { useFormat } from "@/hooks/useFormat";
import { toDate } from "@/lib/format";
import { animalProductValue, getActualProducts, PRODUCT_TYPES, resolveProductPrices } from "@/lib/metrics";
import { PRODUCT_TYPES_BY_ANIMAL, type AnimalProduct, type FeedEntry, type HealthEvent } from "@/types/animal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { List, ListRow } from "@/components/ui/List";
import { Menu } from "@/components/ui/Menu";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CompareBars, HowCalculated, KeyFigures } from "@/components/ui/charts";
import { ProductionChart } from "./ProductionChart";
import { ProductWeekList } from "./ProductWeekList";
import { HEALTH_ICON, HEALTH_TONE } from "./icons";
import {
  AnimalDialog, FeedDialog, HealthDialog, IconTile, ProductDialog,
  animalLabel, formatFeedAmount, formatProductAmount, useRecordActions,
} from "./shared";
import { useToday } from "@/hooks/useToday";

type Tab = "production" | "feed" | "health" | "journal";
type Dialog =
  | { kind: "none" }
  | { kind: "animal" }
  | { kind: "product"; entry?: AnimalProduct }
  | { kind: "feed"; entry?: FeedEntry }
  | { kind: "health"; entry?: HealthEvent };

const byDate = <T extends { date: string }>(a: T, b: T) => b.date.localeCompare(a.date);

export function AnimalDetail() {
  const now = useToday();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const f = useFormat();
  const { deleteProduct, deleteFeed, deleteHealth } = useRecordActions();
  const productPrices = useAnalysisPrefs((s) => s.productPrices);

  const { animals, animalProducts, feedEntries, healthEvents, journalEntries } = useStore(useShallow((s) => ({
    animals: s.animals, animalProducts: s.animalProducts, feedEntries: s.feedEntries,
    healthEvents: s.healthEvents, journalEntries: s.journalEntries,
  })));

  const animal = animals.find((a) => a.id === id);
  const products = useMemo(() => animalProducts.filter((p) => p.animalId === id).sort(byDate), [animalProducts, id]);
  const feeds = useMemo(() => feedEntries.filter((e) => e.animalId === id).sort(byDate), [feedEntries, id]);
  const health = useMemo(() => healthEvents.filter((h) => h.animalId === id).sort(byDate), [healthEvents, id]);
  const journal = useMemo(() => journalEntries.filter((j) => j.animalId === id).sort(byDate), [journalEntries, id]);

  const [tab, setTab] = useState<Tab>("production");
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });
  const close = () => setDialog({ kind: "none" });

  const analytics = useMemo(() => {
    const feedCost = feeds.reduce((s, e) => s + (e.cost ?? 0), 0);
    const vetCost = health.reduce((s, h) => s + (h.cost ?? 0), 0);
    const cost = feedCost + vetCost;
    const totals = getActualProducts(products, null);
    const value = animalProductValue(totals, resolveProductPrices(productPrices));
    // Main product: the first one this animal type yields that has entries (eggs for hens, honey for bees).
    const main = (animal ? PRODUCT_TYPES_BY_ANIMAL[animal.type] : PRODUCT_TYPES).find((ty) => totals[ty] > 0) ?? PRODUCT_TYPES.find((ty) => totals[ty] > 0);
    const others = PRODUCT_TYPES.filter((ty) => ty !== main && totals[ty] > 0);
    // All costs are attributed to the main product — splitting them across honey and wax would count them twice.
    const perUnit = main && main !== "wax" && main !== "wool" ? { type: main, cost: cost / totals[main] } : null;
    return { feedCost, vetCost, cost, value, net: value - cost, perUnit, totals, main, others };
  }, [feeds, health, products, productPrices, animal]);

  if (!animal) {
    return (
      <Card>
        <EmptyState
          icon={HeartPulse}
          title={t("livestock.animalNotFound")}
          description={t("livestock.animalNotFoundText")}
          action={<Button onClick={() => navigate("/livestock")}><ArrowLeft size={16} aria-hidden="true" />{t("livestock.backToHerd")}</Button>}
        />
      </Card>
    );
  }

  const acquired = toDate(animal.acquiredDate);
  const days = acquired ? differenceInCalendarDays(now, acquired) : 0;

  const addLabel: Record<Exclude<Tab, "journal">, string> = {
    // "Ertrag" everywhere: tab "Erträge", this button, the production page and the dialog.
    production: t("livestock.addProduct"),
    feed: t("livestock.addFeed"),
    health: t("livestock.health.addEntry"),
  };
  const openAddForTab = () => setDialog(tab === "feed" ? { kind: "feed" } : tab === "health" ? { kind: "health" } : { kind: "product" });

  const rowMenu = (onEdit: () => void, onDelete: () => void) => (
    <Menu
      label={t("common.moreActions")}
      items={[
        { label: t("common.edit"), icon: Pencil, onSelect: onEdit },
        "separator",
        { label: t("common.delete"), icon: Trash2, danger: true, onSelect: onDelete },
      ]}
    />
  );

  const empty = (icon: typeof Egg, title: string, text: string) => (
    <Card>
      <EmptyState
        compact
        icon={icon}
        title={title}
        description={text}
        action={tab !== "journal" ? <Button onClick={openAddForTab}><Plus size={16} aria-hidden="true" />{addLabel[tab]}</Button> : <Button onClick={() => navigate("/journal")}>{t("livestock.toJournal")}</Button>}
      />
    </Card>
  );

  return (
    <div>
      <PageHeader
        leading={<IconButton icon={ArrowLeft} label={t("livestock.backToHerd")} onClick={() => navigate("/livestock")} />}
        title={animalLabel(animal, t)}
        description={[
          t(`livestock.typeCount.${animal.type}`, { count: animal.count }),
          t("livestock.sinceDate", { date: f.formatDate(animal.acquiredDate, "short") }),
          t("livestock.daysKept", { count: days }),
        ].join(" · ")}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog({ kind: "animal" })}>
              <Pencil size={16} aria-hidden="true" />
              {t("livestock.editAnimal")}
            </Button>
            {/* The add action of the open tab sits with the page actions, not floating mid-page. */}
            {tab !== "journal" && (
              <Button onClick={openAddForTab}>
                <Plus size={16} aria-hidden="true" />
                {addLabel[tab]}
              </Button>
            )}
          </>
        }
      />

      <KeyFigures
        className="mb-2"
        hero={{
          label: t("livestock.balance"),
          value: f.formatCurrency(analytics.net),
          icon: Scale,
          visualPlacement: "below",
          visual: (
            <CompareBars
              rows={[
                { label: t("livestock.productionValue"), value: analytics.value, color: "brand" },
                { label: t("livestock.totalCosts"), value: analytics.cost, color: "earth" },
              ]}
            />
          ),
          hint: analytics.cost > 0
            ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                {/* Same pattern as the cost page: status in the chip, the number as text. */}
                <Badge tone={analytics.net >= 0 ? "positive" : "warning"} icon={analytics.net > 0 ? ArrowUpRight : analytics.net < 0 ? ArrowDownRight : undefined}>
                  {analytics.net >= 0 ? t("expenses.surplus") : t("expenses.deficit")}
                </Badge>
                {t("dashboard.roiValue", { value: f.formatPercent(analytics.net / analytics.cost) })}
              </span>
            )
            : undefined,
        }}
        items={[
          {
            label: t("livestock.productionTotal"),
            value: analytics.main ? formatProductAmount(analytics.main, analytics.totals[analytics.main], f, t) : "–",
            hint: [
              ...analytics.others.map((ty) => (ty === "eggs" ? formatProductAmount(ty, analytics.totals[ty], f, t) : `${formatProductAmount(ty, analytics.totals[ty], f, t)} ${t(`livestock.products.${ty}`)}`)),
              t("livestock.entriesHint", { count: products.length }),
            ].join(" · "),
          },
          {
            label: t("livestock.totalCosts"),
            value: f.formatCurrency(analytics.cost),
            // The cost per egg / kg is a derived figure: meta size, under the costs it comes from.
            hint: [
              t("livestock.costSplit", { feed: f.formatCurrency(analytics.feedCost), vet: f.formatCurrency(analytics.vetCost) }),
              analytics.cost > 0 && analytics.perUnit ? t(`livestock.costPer.${analytics.perUnit.type}`, { cost: f.formatCurrency(analytics.perUnit.cost) }) : null,
            ].filter(Boolean).join(" · "),
          },
          // The production value already stands in the balance bars above.
        ]}
      />
      <div className="mb-6">
        <HowCalculated>
          <p>{t("livestock.howValue")}</p>
          <p>{t("metrics.pricesEditable")}</p>
        </HowCalculated>
      </div>

      {products.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">{t("livestock.chartTitle")}</h2>
          <ProductionChart animalProducts={products} rangeProducts={animalProducts} months={12} />
        </Card>
      )}

      <Tabs
        label={t("livestock.detailTabs")}
        value={tab}
        onChange={setTab}
        items={[
          // Not "Produktion/Futter/Gesundheit": those name the section tabs above, which leave this animal.
          { value: "production", label: t("livestock.tabYields"), count: products.length },
          { value: "feed", label: t("livestock.tabFeedings"), count: feeds.length },
          { value: "health", label: t("livestock.tabTreatments"), count: health.length },
          { value: "journal", label: t("nav.journal"), count: journal.length },
        ]}
      >
        <div className="space-y-3">
          {tab === "production" && (products.length === 0 ? empty(Egg, t("livestock.noProductsTitle"), t("livestock.noProducts")) : (
            <ProductWeekList
              initialWeeks={4}
              products={products}
              onOpen={(p) => setDialog({ kind: "product", entry: p })}
              renderActions={(p) => rowMenu(() => setDialog({ kind: "product", entry: p }), () => void deleteProduct(p))}
            />
          ))}

          {tab === "feed" && (feeds.length === 0 ? empty(Wheat, t("livestock.noFeedTitle"), t("livestock.noFeed")) : (
            <List label={t("livestock.tabFeedings")}>
              {feeds.map((e) => (
                <ListRow
                  key={e.id}
                  leading={<IconTile icon={Wheat} />}
                  title={e.feedType}
                  meta={[f.formatDate(e.date, "relative"), formatFeedAmount(e, f)]}
                  description={e.notes}
                  trailing={e.cost !== undefined ? f.formatCurrency(e.cost) : undefined}
                  onClick={() => setDialog({ kind: "feed", entry: e })}
                  actions={rowMenu(() => setDialog({ kind: "feed", entry: e }), () => void deleteFeed(e))}
                />
              ))}
            </List>
          ))}

          {tab === "health" && (health.length === 0 ? empty(HeartPulse, t("livestock.noHealthTitle"), t("livestock.noHealth")) : (
            <List label={t("livestock.tabTreatments")}>
              {health.map((h) => (
                <ListRow
                  key={h.id}
                  leading={<IconTile icon={HEALTH_ICON[h.type]} tone={HEALTH_TONE[h.type]} />}
                  title={h.description}
                  badges={h.description.toLocaleLowerCase().includes(t(`livestock.healthTypes.${h.type}`).toLocaleLowerCase()) ? undefined : <Badge tone={HEALTH_TONE[h.type]}>{t(`livestock.healthTypes.${h.type}`)}</Badge>}
                  meta={<time dateTime={h.date}>{f.formatDate(h.date, "relative")}</time>}
                  description={h.notes}
                  trailing={h.cost !== undefined ? f.formatCurrency(h.cost) : undefined}
                  onClick={() => setDialog({ kind: "health", entry: h })}
                  actions={rowMenu(() => setDialog({ kind: "health", entry: h }), () => void deleteHealth(h))}
                />
              ))}
            </List>
          ))}

          {tab === "journal" && (journal.length === 0 ? empty(BookOpen, t("livestock.noJournalTitle"), t("livestock.noJournal")) : (
            <List label={t("nav.journal")}>
              {journal.map((j) => (
                <ListRow
                  key={j.id}
                  leading={<IconTile icon={BookOpen} />}
                  title={j.title}
                  meta={<time dateTime={j.date}>{f.formatDate(j.date, "relative")}</time>}
                  description={j.text}
                />
              ))}
            </List>
          ))}
        </div>
      </Tabs>

      <AnimalDialog open={dialog.kind === "animal"} animal={animal} onClose={close} onDeleted={() => navigate("/livestock")} />
      <ProductDialog open={dialog.kind === "product"} entry={dialog.kind === "product" ? dialog.entry : undefined} animalId={animal.id} onClose={close} />
      <FeedDialog open={dialog.kind === "feed"} entry={dialog.kind === "feed" ? dialog.entry : undefined} animalId={animal.id} onClose={close} />
      <HealthDialog open={dialog.kind === "health"} entry={dialog.kind === "health" ? dialog.entry : undefined} animalId={animal.id} onClose={close} />
    </div>
  );
}
