import { describe, expect, it } from "vitest";
import { buildCostsCsv } from "@/lib/dataExport";
import { getCosts } from "@/lib/metrics";
import type { Expense } from "@/types/expense";
import type { FeedEntry, HealthEvent } from "@/types/animal";

const expenses: Expense[] = [
  { id: "e1", date: "2026-08-01", category: "seeds", description: "Saatgut", amountCents: 1250 },
  // Same bill as feed entry f1 (same amount within 3 days): counted once.
  { id: "e2", date: "2026-08-10", category: "animal_feed", description: "Legemehl", amountCents: 2290 },
] as Expense[];
const feedEntries: FeedEntry[] = [
  { id: "f1", animalId: "a", date: "2026-08-11", feedType: "Legemehl", quantity: 25, unit: "kg", cost: 22.9 },
  { id: "f2", animalId: "a", date: "2026-09-01", feedType: "Körner", quantity: 10, unit: "kg", cost: 11.5 },
] as FeedEntry[];
const healthEvents: HealthEvent[] = [
  { id: "h1", animalId: "a", date: "2026-09-05", type: "treatment", description: "Varroa", cost: 8 },
] as HealthEvent[];

describe("cost CSV", () => {
  it("lists the same rows and total as the cost page", () => {
    const { csv, rows } = buildCostsCsv({ expenses, feedEntries, healthEvents });
    const lines = csv.split("\n").slice(1);
    expect(rows).toBe(4); // 2 expenses + f2 + h1 (f1 is the same bill as e2)
    expect(lines).toHaveLength(4);
    const total = lines.reduce((s, l) => s + Number(l.split(",")[3]), 0);
    const costs = getCosts({ expenses, feedEntries, healthEvents, period: null });
    expect(total).toBeCloseTo(costs.total);
  });

  it("marks the expense that is also in a log", () => {
    const costs = getCosts({ expenses, feedEntries, healthEvents, period: null });
    expect(costs.matchedExpenses).toEqual({ e2: "feed" });
    const { csv } = buildCostsCsv({ expenses, feedEntries, healthEvents });
    expect(csv).toContain("Legemehl,22.90,expense+feed");
  });
});
