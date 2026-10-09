import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownRight, ArrowUpRight, Droplet, Fence, Hammer, Layers, Leaf, Package, Pencil, Plus, ReceiptText, Scale, Sprout, Stethoscope, Trash2, Wheat,
  type LucideIcon,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { useAnalysisPrefs } from "@/store/analysisPrefs";
import { useFormat } from "@/hooks/useFormat";
import { useGardenMetrics } from "@/hooks/useGardenMetrics";
import { useOpenAddOnNavigate } from "@/hooks/useOpenAddOnNavigate";
import { todayISO } from "@/lib/format";
import { DEFAULT_PRODUCT_PRICES, PRODUCT_TYPES, type CostLogEntry, type Period } from "@/lib/metrics";
import type { Expense, ExpenseCategory } from "@/types/expense";
import type { ProductType } from "@/types/animal";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { List, ListRow } from "@/components/ui/List";
import { Menu } from "@/components/ui/Menu";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast, useConfirmDelete } from "@/components/ui/Toast";
import { TONE_SOFT } from "@/components/ui/tone";
import { CompareBars, HowCalculated, KeyFigures, Meter } from "@/components/ui/charts";
import { DateField } from "@/components/ui/DateField";
import { useToday } from "@/hooks/useToday";

const CATEGORIES: ExpenseCategory[] = ["seeds", "soil", "fertilizer", "tools", "infrastructure", "water", "animal_feed", "veterinary", "other"];

const CATEGORY_ICON: Record<ExpenseCategory, LucideIcon> = {
  seeds: Sprout,
  soil: Layers,
  tools: Hammer,
  fertilizer: Leaf,
  infrastructure: Fence,
  water: Droplet,
  animal_feed: Wheat,
  veterinary: Stethoscope,
  other: Package,
};

function CategoryTile({ category }: { category: ExpenseCategory }) {
  const Icon = CATEGORY_ICON[category];
  return (
    <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg ${TONE_SOFT.neutral}`} aria-hidden="true">
      <Icon size={16} />
    </span>
  );
}

interface Draft { description: string; amount: string; category: ExpenseCategory; date: string; notes: string }
const emptyDraft = (): Draft => ({ description: "", amount: "", category: "seeds", date: todayISO(), notes: "" });
const parseAmount = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));

export function ExpenseDashboard() {
  const now = useToday();
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();
  const { toast } = useToast();
  const confirmDelete = useConfirmDelete();
  const { expenses, harvests, addExpense, updateExpense, deleteExpense } = useStore(
    useShallow((s) => ({ expenses: s.expenses, harvests: s.harvests, addExpense: s.addExpense, updateExpense: s.updateExpense, deleteExpense: s.deleteExpense })),
  );
  const { productPrices, setProductPrice } = useAnalysisPrefs(useShallow((p) => ({ productPrices: p.productPrices, setProductPrice: p.setProductPrice })));

  const year = now.getFullYear();
  const [scope, setScope] = useState<"season" | "all">("season");
  const period: Period = scope === "season" ? year : null;
  const m = useGardenMetrics({ period });
  const { balance } = m;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const openAdd = useCallback(() => {
    setEditingId(null);
    setDraft(emptyDraft());
    setDialogOpen(true);
  }, []);
  useOpenAddOnNavigate(openAdd);

  const openEdit = (e: Expense) => {
    setEditingId(e.id);
    setDraft({ description: e.description, amount: (e.amountCents / 100).toLocaleString(f.locale, { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 }), category: e.category, date: e.date, notes: e.notes ?? "" });
    setDialogOpen(true);
  };

  const amount = parseAmount(draft.amount);
  const canSave = draft.description.trim() !== "" && amount > 0;

  const save = () => {
    if (!canSave) return;
    const fields = { description: draft.description.trim(), amountCents: Math.round(amount * 100), category: draft.category, date: draft.date, notes: draft.notes.trim() || undefined };
    if (editingId) {
      updateExpense(editingId, fields);
      toast(t("expenses.updated"), "success");
    } else {
      addExpense({ ...fields, gardenId: "" });
      toast(t("expenses.saved", { amount: f.formatCurrency(amount), description: fields.description }), "success");
    }
    setDialogOpen(false);
  };

  const remove = async (e: Expense) => {
    if (!(await confirmDelete("expense", `${e.description} · ${f.formatCurrency(e.amountCents / 100)}`))) return;
    deleteExpense(e.id);
    setDialogOpen(false);
    const { id: _id, ...rest } = e;
    toast(t("expenses.deleted"), "success", { action: { label: t("common.undo"), onClick: () => addExpense(rest) } });
  };

  const visible = useMemo(
    () => expenses.filter((e) => period === null || e.date.startsWith(`${period}-`)).sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, period],
  );
  // Costs from the feed and health logs count in the KPI, so they appear in the
  // list too (read-only, marked with their source): month sums add up to the total.
  type Row = { kind: "expense"; date: string; expense: Expense } | { kind: "log"; date: string; entry: CostLogEntry };
  const groups = useMemo(() => {
    const rows: Row[] = [
      ...visible.map((e) => ({ kind: "expense" as const, date: e.date, expense: e })),
      ...balance.costs.logEntries.map((entry) => ({ kind: "log" as const, date: entry.date, entry })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    const out: { key: string; items: Row[]; sum: number }[] = [];
    for (const r of rows) {
      const key = r.date.slice(0, 7);
      const amount = r.kind === "expense" ? r.expense.amountCents / 100 : r.entry.cost;
      const last = out[out.length - 1];
      if (last?.key === key) { last.items.push(r); last.sum += amount; }
      else out.push({ key, items: [r], sum: amount });
    }
    return out;
  }, [visible, balance.costs.logEntries]);

  // One breakdown (metrics.getCosts): livestock feed/vet logs are part of
  // the animal_feed/veterinary categories, with their origin as a note.
  const categoryRows = useMemo(() => {
    const fromLog: Partial<Record<ExpenseCategory, number>> = { animal_feed: balance.costs.feed, veterinary: balance.costs.veterinary };
    return CATEGORIES
      .filter((c) => (balance.costs.byCategory[c] ?? 0) > 0)
      .map((c) => ({ key: c, label: t(`expenses.categories.${c}`), icon: CATEGORY_ICON[c], amount: balance.costs.byCategory[c] ?? 0, fromLog: fromLog[c] ?? 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [balance.costs, t]);

  const hasAnything = expenses.length > 0 || harvests.length > 0 || balance.costs.total > 0 || balance.totalValue > 0;
  const editing = editingId ? expenses.find((e) => e.id === editingId) : undefined;
  const addButton = (
    <Button onClick={openAdd}>
      <Plus size={16} aria-hidden="true" />
      {t("expenses.add")}
    </Button>
  );
  const net = balance.net;

  return (
    <div>
      <PageHeader title={t("expenses.title")} description={t("expenses.subtitle")} actions={hasAnything ? addButton : undefined} />

      {!hasAnything ? (
        <Card>
          <EmptyState icon={ReceiptText} title={t("expenses.emptyTitle")} description={t("expenses.emptyText")} action={addButton} secondaryAction={<Button variant="ghost" onClick={() => navigate("/harvest")}>{t("expenses.toHarvest")}</Button>} />
        </Card>
      ) : (
        <div className="space-y-6">
          <SegmentedControl
            label={t("expenses.period")}
            value={scope}
            onChange={setScope}
            options={[
              { value: "season", label: t("expenses.season", { year }) },
              { value: "all", label: t("expenses.allTime") },
            ]}
          />

          {/* The disclosure explains the figures: attached below them, not a section of its own. */}
          <div>
            <KeyFigures
              hero={{
                label: t("expenses.net"),
                value: f.formatCurrency(net),
                icon: Scale,
                visualPlacement: "below",
                visual: (
                  <CompareBars
                    rows={[
                      { label: t("expenses.yieldValue"), value: balance.totalValue, color: "brand" },
                      { label: t("expenses.totalCosts"), value: balance.costs.total, color: "earth" },
                    ]}
                  />
                ),
                hint: (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <Badge tone={net >= 0 ? "positive" : "warning"} icon={net > 0 ? ArrowUpRight : net < 0 ? ArrowDownRight : undefined}>{net >= 0 ? t("expenses.surplus") : t("expenses.deficit")}</Badge>
                    {balance.roi === null ? t("expenses.roiNoCosts") : t("dashboard.roiValue", { value: f.formatPercent(balance.roi) })}
                  </span>
                ),
              }}
              items={[
                {
                  label: t("expenses.totalCosts"),
                  value: f.formatCurrency(balance.costs.total),
                  hint: balance.costs.animals > 0 ? t("expenses.inclAnimals", { amount: f.formatCurrency(balance.costs.animals) }) : undefined,
                },
                {
                  label: t("expenses.yieldValue"),
                  value: f.formatCurrency(balance.totalValue),
                  hint: t("expenses.valueSplit", { harvest: f.formatCurrency(balance.produceValue), animals: f.formatCurrency(balance.animalValue) }),
                },
              ]}
            />

            <HowCalculated className="mt-1">
                <p>{t("expenses.howCosts")}</p>
                {balance.costs.animals > 0 && (
                  <p>
                    {t("expenses.howAnimals", {
                      total: f.formatCurrency(balance.costs.animals),
                      expenses: f.formatCurrency((balance.costs.expenseByCategory.animal_feed ?? 0) + (balance.costs.expenseByCategory.veterinary ?? 0)),
                      log: f.formatCurrency(balance.costs.feed + balance.costs.veterinary),
                    })}
                    {balance.costs.duplicatesSkipped > 0 && <> {t("expenses.duplicatesSkipped", { count: balance.costs.duplicatesSkipped })}</>}
                  </p>
                )}
                <p>{t("expenses.howValue")}</p>
                <p>{t("expenses.howRoi")}</p>
                <div>
                  <p className="mb-2 font-medium text-gray-800 dark:text-gray-200">{t("expenses.productPrices")}</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {PRODUCT_TYPES.map((type: ProductType) => (
                      <Input
                        key={type}
                        label={t(`expenses.pricePer.${type}`)}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={0.05}
                        value={productPrices[type] ?? ""}
                        placeholder={f.formatNumber(DEFAULT_PRODUCT_PRICES[type], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        onChange={(e) => setProductPrice(type, e.target.value === "" ? null : Number(e.target.value))}
                      />
                    ))}
                  </div>
                  <p className="mt-2">{t("expenses.priceHint")}</p>
                </div>
            </HowCalculated>
          </div>

          {categoryRows.length > 0 && (
            <Card>
              <CardHeader title={t("expenses.byCategory")} description={t("expenses.byCategoryDesc")} />
              <ul className="space-y-3">
                {categoryRows.map((r) => {
                  const Icon = r.icon;
                  return (
                    <li key={r.key}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                          <Icon size={14} aria-hidden="true" className="text-gray-500" />
                          {r.label}
                        </span>
                        <span className="tabular-nums text-gray-900 dark:text-gray-100">
                          {f.formatCurrency(r.amount)}
                          <span className="ml-1 text-gray-500 dark:text-gray-400">· {f.formatPercent(r.amount / balance.costs.total)}</span>
                        </span>
                      </div>
                      <Meter actual={r.amount} max={balance.costs.total} color="muted" label={`${r.label}: ${f.formatCurrency(r.amount)}`} />
                      {r.fromLog > 0 && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {t(r.key === "veterinary" ? "expenses.fromHealthLog" : "expenses.fromFeedLog", { amount: f.formatCurrency(r.fromLog) })}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <section aria-labelledby="expense-list" className="space-y-3">
            <h2 id="expense-list" className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t("expenses.entries")}</h2>
            {groups.length === 0 ? (
              <Card>
                <EmptyState compact icon={ReceiptText} title={t("expenses.noEntriesTitle")} description={t("expenses.noEntries")} action={addButton} />
              </Card>
            ) : groups.map((g) => (
              <List key={g.key} header={`${f.formatDate(`${g.key}-01`, "monthYear")} · ${f.formatCurrency(g.sum)}`}>
                {g.items.map((r) => {
                  if (r.kind === "log") {
                    const { entry } = r;
                    return (
                      <ListRow
                        key={`${entry.source}-${entry.id}`}
                        leading={<CategoryTile category={entry.source === "feed" ? "animal_feed" : "veterinary"} />}
                        title={entry.label}
                        meta={[t(entry.source === "feed" ? "expenses.fromFeedBook" : "expenses.fromHealthBook"), f.formatDate(entry.date, "relative")]}
                        trailing={f.formatCurrency(entry.cost)}
                        onClick={() => navigate(entry.source === "feed" ? "/livestock/feed" : "/livestock/health")}
                        clickLabel={`${entry.label} · ${t(entry.source === "feed" ? "expenses.fromFeedBook" : "expenses.fromHealthBook")}`}
                        // Same menu slot as the expense rows, so every amount lines up.
                        actions={
                          <Menu
                            label={t("common.moreActions")}
                            items={[{
                              label: t(entry.source === "feed" ? "expenses.openFeedBook" : "expenses.openHealthBook"),
                              icon: ArrowUpRight,
                              onSelect: () => navigate(entry.source === "feed" ? "/livestock/feed" : "/livestock/health"),
                            }]}
                          />
                        }
                      />
                    );
                  }
                  const e = r.expense;
                  return (
                  <ListRow
                    key={e.id}
                    leading={<CategoryTile category={e.category} />}
                    title={e.description}
                    meta={[t(`expenses.categories.${e.category}`), f.formatDate(e.date, "relative")]}
                    trailing={f.formatCurrency(e.amountCents / 100)}
                    onClick={() => openEdit(e)}
                    actions={
                      <Menu
                        label={t("common.moreActions")}
                        items={[
                          { label: t("common.edit"), icon: Pencil, onSelect: () => openEdit(e) },
                          "separator",
                          { label: t("common.delete"), icon: Trash2, danger: true, onSelect: () => void remove(e) },
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

      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingId ? t("expenses.edit") : t("expenses.add")}
        footer={
          <>
            {editing && (
              <Button variant="danger-ghost" className="mr-auto" onClick={() => void remove(editing)}>
                <Trash2 size={16} aria-hidden="true" />
                {t("common.delete")}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={save} disabled={!canSave}>{t("common.save")}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label={t("expenses.description")} value={draft.description} onChange={(e) => patch({ description: e.target.value })} placeholder={t("expenses.descriptionPlaceholder")} autoFocus />
          {/* Amount and category stay side by side on phones; a text field with a decimal keypad accepts "12,50". */}
          <div className="grid grid-cols-2 gap-4">
            <Input label={t("expenses.amount")} inputMode="decimal" value={draft.amount} onChange={(e) => patch({ amount: e.target.value })} placeholder={t("common.examplePlaceholder", { value: f.formatNumber(12.5, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })} />
            <Select
              label={t("expenses.category")}
              value={draft.category}
              onChange={(e) => patch({ category: e.target.value as ExpenseCategory })}
              options={CATEGORIES.map((c) => ({ value: c, label: t(`expenses.categories.${c}`) }))}
            />
          </div>
          <DateField label={t("harvest.date")} value={draft.date} onChange={(date) => patch({ date })} />
          <Textarea label={t("harvest.notes")} optional placeholder={t("expenses.notesPlaceholder")} value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} rows={2} />
        </div>
      </Modal>
    </div>
  );
}
