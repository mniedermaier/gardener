import { Fragment, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, Coins, HeartPulse, Pencil, Plus, Scale, Trash2, Wheat, Egg } from "lucide-react";
import { differenceInCalendarDays, endOfWeek, getISOWeek, startOfWeek } from "date-fns";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { useAnalysisPrefs } from "@/store/analysisPrefs";
import { useFormat } from "@/hooks/useFormat";
import { toDate, toISODate } from "@/lib/format";
import { animalProductValue, getActualProducts, PRODUCT_TYPES, resolveProductPrices, type ProductTotals } from "@/lib/metrics";
import { PRODUCT_TYPES_BY_ANIMAL, type AnimalProduct, type FeedEntry, type HealthEvent } from "@/types/animal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Tabs } from "@/components/ui/Tabs";
import { List, ListRow } from "@/components/ui/List";
import { Menu } from "@/components/ui/Menu";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { HowCalculated } from "@/components/ui/charts";
import { ProductionChart } from "./ProductionChart";
import { HEALTH_ICON, HEALTH_TONE, PRODUCT_ICON } from "./icons";
import {
  AnimalDialog, FeedDialog, HealthDialog, IconTile, ProductDialog,
  animalLabel, formatFeedAmount, formatProductAmount, useRecordActions,
} from "./shared";

type Tab = "production" | "feed" | "health" | "journal";
type Dialog =
  | { kind: "none" }
  | { kind: "animal" }
  | { kind: "product"; entry?: AnimalProduct }
  | { kind: "feed"; entry?: FeedEntry }
  | { kind: "health"; entry?: HealthEvent };

const byDate = <T extends { date: string }>(a: T, b: T) => b.date.localeCompare(a.date);

/** Weeks grouped by the month their Monday falls in — a week is never split across two cards. */
function weeksByMonth(weeks: ReturnType<typeof groupByWeek>) {
  const out: { key: string; date: Date; count: number; weeks: typeof weeks }[] = [];
  for (const w of weeks) {
    const key = toISODate(w.from).slice(0, 7);
    let g = out.find((x) => x.key === key);
    if (!g) {
      g = { key, date: w.from, count: 0, weeks: [] };
      out.push(g);
    }
    g.weeks.push(w);
    g.count += w.items.length;
  }
  return out;
}

/** Products (sorted newest first) grouped into ISO weeks with totals per product. */
function groupByWeek(items: AnimalProduct[]) {
  const out: { key: string; week: number; from: Date; to: Date; items: AnimalProduct[]; totals: ProductTotals }[] = [];
  for (const p of items) {
    const d = toDate(p.date) ?? new Date();
    const from = startOfWeek(d, { weekStartsOn: 1 });
    const key = toISODate(from);
    let g = out.find((x) => x.key === key);
    if (!g) {
      g = { key, week: getISOWeek(d), from, to: endOfWeek(d, { weekStartsOn: 1 }), items: [], totals: { eggs: 0, honey: 0, meat: 0, wax: 0, milk: 0, wool: 0 } };
      out.push(g);
    }
    g.items.push(p);
    g.totals[p.type] += p.unit === "g" ? p.quantity / 1000 : p.quantity;
  }
  return out;
}

export function AnimalDetail() {
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
  const [openWeeks, setOpenWeeks] = useState<Set<string>>(() => new Set());
  const toggleWeek = (key: string) => setOpenWeeks((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
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

  const availableTypes = new Set(products.map((p) => p.type)).size;
  const acquired = toDate(animal.acquiredDate);
  const days = acquired ? differenceInCalendarDays(new Date(), acquired) : 0;

  const addLabel: Record<Exclude<Tab, "journal">, string> = {
    production: t("livestock.addProduct"),
    feed: t("livestock.addFeed"),
    health: t("livestock.addHealth"),
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
          <Button variant="secondary" onClick={() => setDialog({ kind: "animal" })}>
            <Pencil size={16} aria-hidden="true" />
            {t("livestock.editAnimal")}
          </Button>
        }
      />

      <div className="mb-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t("livestock.productionTotal")}
          value={analytics.main ? formatProductAmount(analytics.main, analytics.totals[analytics.main], f, t) : "–"}
          icon={analytics.main ? PRODUCT_ICON[analytics.main] : Egg}
          tone="neutral"
          hint={[
            ...analytics.others.map((ty) => (ty === "eggs" ? formatProductAmount(ty, analytics.totals[ty], f, t) : `${formatProductAmount(ty, analytics.totals[ty], f, t)} ${t(`livestock.products.${ty}`)}`)),
            t("livestock.entriesHint", { count: products.length }),
          ].join(" · ")}
        />
        <StatCard label={t("livestock.totalCosts")} value={f.formatCurrency(analytics.cost)} hint={t("livestock.costSplit", { feed: f.formatCurrency(analytics.feedCost), vet: f.formatCurrency(analytics.vetCost) })} icon={Coins} tone="neutral" />
        <StatCard label={t("livestock.productionValue")} value={f.formatCurrency(analytics.value)} icon={Scale} tone="neutral" />
        <StatCard
          label={t("livestock.balance")}
          value={f.formatCurrency(analytics.net)}
          icon={Scale}
          tone="neutral"
          trend={analytics.cost > 0 ? { label: f.formatPercent(analytics.net / analytics.cost), direction: analytics.net > 0 ? "up" : analytics.net < 0 ? "down" : "flat", tone: analytics.net >= 0 ? "positive" : "warning" } : undefined}
          hint={analytics.cost > 0 ? t("livestock.roiHint") : undefined}
        />
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {analytics.cost > 0 && analytics.perUnit && (
          <Badge variant="outline" icon={PRODUCT_ICON[analytics.perUnit.type]}>
            {t(`livestock.costPer.${analytics.perUnit.type}`, { cost: f.formatCurrency(analytics.perUnit.cost) })}
          </Badge>
        )}
        <HowCalculated>
          <p>{t("livestock.howValue")}</p>
          <p>{t("metrics.pricesEditable")}</p>
        </HowCalculated>
      </div>

      {products.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">{t("livestock.chartTitle")}</h2>
          <ProductionChart animalProducts={products} />
        </Card>
      )}

      <Tabs
        label={t("livestock.detailTabs")}
        value={tab}
        onChange={setTab}
        items={[
          { value: "production", label: t("livestock.productionTab"), count: products.length },
          { value: "feed", label: t("livestock.feedTab"), count: feeds.length },
          { value: "health", label: t("livestock.healthTab"), count: health.length },
          { value: "journal", label: t("nav.journal"), count: journal.length },
        ]}
      >
        <div className="space-y-3">
          {tab !== "journal" && (
            <div className="flex justify-end">
              <Button onClick={openAddForTab}><Plus size={16} aria-hidden="true" />{addLabel[tab]}</Button>
            </div>
          )}

          {tab === "production" && (products.length === 0 ? empty(Egg, t("livestock.noProductsTitle"), t("livestock.noProducts")) : (
            <div className="space-y-3">
              {weeksByMonth(groupByWeek(products)).map((g) => (
                <List key={g.key} header={`${f.formatDate(g.date, "monthYear")} · ${t("livestock.entriesHint", { count: g.count })}`}>
                  {g.weeks.map((w) => {
                    const open = openWeeks.has(w.key);
                    const sums = PRODUCT_TYPES.filter((ty) => w.totals[ty] > 0).map((ty) => formatProductAmount(ty, w.totals[ty], f, t) + (availableTypes > 1 && ty !== "eggs" ? ` ${t(`livestock.products.${ty}`)}` : ""));
                    const weekTitle = `${t("livestock.weekShort", { week: w.week })} · ${sums.join(" · ")}`;
                    return (
                      <Fragment key={w.key}>
                        <ListRow
                          leading={<IconTile icon={open ? ChevronDown : ChevronRight} />}
                          title={weekTitle}
                          meta={`${f.formatDate(w.from, "short")} – ${f.formatDate(w.to, "short")} · ${t("livestock.entriesHint", { count: w.items.length })}`}
                          clickLabel={`${weekTitle} – ${t(open ? "livestock.hideEntries" : "livestock.showEntries")}`}
                          onClick={() => toggleWeek(w.key)}
                          trailing={null}
                        />
                        {open && w.items.map((p) => (
                          <ListRow
                            key={p.id}
                            className="pl-8 sm:pl-10"
                            leading={<IconTile icon={PRODUCT_ICON[p.type]} />}
                            title={formatProductAmount(p.type, p.unit === "g" ? p.quantity / 1000 : p.quantity, f, t)}
                            meta={[availableTypes > 1 ? t(`livestock.products.${p.type}`) : null, f.formatDate(p.date, "relative")].filter(Boolean).join(" · ")}
                            description={p.notes}
                            onClick={() => setDialog({ kind: "product", entry: p })}
                            actions={rowMenu(() => setDialog({ kind: "product", entry: p }), () => void deleteProduct(p))}
                          />
                        ))}
                      </Fragment>
                    );
                  })}
                </List>
              ))}
            </div>
          ))}

          {tab === "feed" && (feeds.length === 0 ? empty(Wheat, t("livestock.noFeedTitle"), t("livestock.noFeed")) : (
            <List label={t("livestock.feedTab")}>
              {feeds.map((e) => (
                <ListRow
                  key={e.id}
                  leading={<IconTile icon={Wheat} />}
                  title={e.feedType}
                  meta={[f.formatDate(e.date, "relative"), formatFeedAmount(e, f)].join(" · ")}
                  description={e.notes}
                  trailing={e.cost !== undefined ? f.formatCurrency(e.cost) : undefined}
                  onClick={() => setDialog({ kind: "feed", entry: e })}
                  actions={rowMenu(() => setDialog({ kind: "feed", entry: e }), () => void deleteFeed(e))}
                />
              ))}
            </List>
          ))}

          {tab === "health" && (health.length === 0 ? empty(HeartPulse, t("livestock.noHealthTitle"), t("livestock.noHealth")) : (
            <List label={t("livestock.healthTab")}>
              {health.map((h) => (
                <ListRow
                  key={h.id}
                  leading={<IconTile icon={HEALTH_ICON[h.type]} tone={HEALTH_TONE[h.type]} />}
                  title={h.description}
                  badges={<Badge tone={HEALTH_TONE[h.type]}>{t(`livestock.healthTypes.${h.type}`)}</Badge>}
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
