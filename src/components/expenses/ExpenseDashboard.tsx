import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, TrendingUp, TrendingDown, Euro } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import type { ExpenseCategory } from "@/types/expense";
import { format } from "date-fns";

const CATEGORIES: ExpenseCategory[] = ["seeds", "soil", "tools", "fertilizer", "infrastructure", "water", "other"];

const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  seeds: "\ud83c\udf31",
  soil: "\ud83e\udea8",
  tools: "\ud83e\uddf0",
  fertilizer: "\ud83d\udca9",
  infrastructure: "\ud83c\udfd7\ufe0f",
  water: "\ud83d\udca7",
  other: "\ud83d\udce6",
};

// Approximate market prices per kg for common garden produce (EUR)
const MARKET_PRICES: Record<string, number> = {
  tomato: 3.5, zucchini: 2.5, carrot: 1.5, lettuce: 2.0, bean: 4.0,
  pea: 5.0, radish: 3.0, cucumber: 2.0, pepper: 4.5, onion: 1.5,
  garlic: 12.0, potato: 1.2, kale: 3.0, spinach: 4.0, beetroot: 2.5,
  leek: 3.0, pumpkin: 2.0, chard: 3.0, kohlrabi: 2.5, fennel: 3.5,
  corn: 2.0, cabbage: 1.5, broccoli: 4.0, cauliflower: 3.5, celery: 3.0,
  turnip: 2.0, strawberry: 8.0, raspberry: 15.0, blueberry: 18.0,
  currant: 10.0, gooseberry: 10.0, basil: 25.0, parsley: 15.0,
  dill: 20.0, chives: 20.0, mint: 20.0, rosemary: 25.0, thyme: 30.0,
  sunflower: 5.0,
};

export function ExpenseDashboard() {
  const { t } = useTranslation();
  const { confirm } = useToast();
  const { expenses, harvests, addExpense, deleteExpense } = useStore(useShallow((s) => ({ expenses: s.expenses, harvests: s.harvests, addExpense: s.addExpense, deleteExpense: s.deleteExpense })));
  const [showAdd, setShowAdd] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("seeds");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [gardenId] = useState("");

  const totalExpenses = expenses.reduce((s, e) => s + e.amountCents, 0);

  const harvestValue = useMemo(() => {
    let total = 0;
    for (const h of harvests) {
      const pricePerKg = MARKET_PRICES[h.plantId] ?? 3.0;
      const kg = (h.weightGrams ?? 0) / 1000;
      total += kg * pricePerKg;
    }
    return Math.round(total * 100);
  }, [harvests]);

  const roi = totalExpenses > 0 ? Math.round(((harvestValue - totalExpenses) / totalExpenses) * 100) : 0;

  const byCategory = useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amountCents);
    }
    return map;
  }, [expenses]);

  const handleAdd = () => {
    if (!description.trim() || !amount) return;
    addExpense({
      gardenId,
      date,
      category,
      description: description.trim(),
      amountCents: Math.round(Number(amount) * 100),
    });
    setDescription("");
    setAmount("");
    setShowAdd(false);
  };

  const formatCents = (cents: number) => `${(cents / 100).toFixed(2)} €`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-bold sm:text-2xl">{t("expenses.title")}</h1>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          {t("expenses.add")}
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
        <Card className="text-center">
          <TrendingDown size={20} className="mx-auto mb-1 text-red-500" />
          <p className="text-lg font-bold sm:text-2xl text-red-600">{formatCents(totalExpenses)}</p>
          <p className="text-xs text-gray-500">{t("expenses.totalExpenses")}</p>
        </Card>
        <Card className="text-center">
          <TrendingUp size={20} className="mx-auto mb-1 text-garden-500" />
          <p className="text-lg font-bold sm:text-2xl text-garden-600">{formatCents(harvestValue)}</p>
          <p className="text-xs text-gray-500">{t("expenses.harvestValue")}</p>
        </Card>
        <Card className="text-center">
          <Euro size={20} className={`mx-auto mb-1 ${roi >= 0 ? "text-garden-500" : "text-red-500"}`} />
          <p className={`text-lg font-bold sm:text-2xl ${roi >= 0 ? "text-garden-600" : "text-red-600"}`}>
            {roi >= 0 ? "+" : ""}{roi}%
          </p>
          <p className="text-xs text-gray-500">{t("expenses.roi")}</p>
        </Card>
      </div>

      {byCategory.size > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">{t("expenses.byCategory")}</h2>
          <div className="space-y-2">
            {Array.from(byCategory.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([cat, cents]) => (
                <div key={cat} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                  <span className="flex items-center gap-2 text-sm">
                    <span>{CATEGORY_ICONS[cat]}</span>
                    {t(`expenses.categories.${cat}`)}
                  </span>
                  <span className="text-sm font-medium">{formatCents(cents)}</span>
                </div>
              ))}
          </div>
        </Card>
      )}

      {expenses.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500">{t("expenses.noEntries")}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {[...expenses].sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
              <span className="text-lg">{CATEGORY_ICONS[e.category]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{e.description}</p>
                <p className="text-xs text-gray-400">{e.date}</p>
              </div>
              <span className="text-sm font-semibold text-red-600">{formatCents(e.amountCents)}</span>
              <button onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteExpense(e.id); }} className="rounded p-1 text-gray-400 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t("expenses.add")}>
        <div className="space-y-4">
          <Input label={t("expenses.description")} value={description} onChange={(e) => setDescription(e.target.value)} autoFocus />
          <Input label={t("expenses.amount")} type="number" step="0.01" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("expenses.category")}</label>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border p-2 text-xs transition-all ${
                    category === cat
                      ? "border-garden-500 bg-garden-50 dark:bg-garden-900/30"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  {t(`expenses.categories.${cat}`)}
                </button>
              ))}
            </div>
          </div>
          <Input label={t("harvest.date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAdd}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
