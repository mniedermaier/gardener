import { describe, expect, it } from "vitest";
import { groupByWeek, weeksByMonth } from "@/components/livestock/ProductWeekList";
import type { AnimalProduct } from "@/types/animal";

const egg = (id: string, date: string, quantity: number): AnimalProduct =>
  ({ id, animalId: "a", type: "eggs", date, quantity, unit: "pieces" }) as AnimalProduct;

describe("production weeks by month", () => {
  it("puts a week under the month that holds most of its days", () => {
    // KW 40/2026: Mon 28 Sept – Sun 4 Oct, Thursday 1 Oct → October.
    const weeks = groupByWeek([egg("1", "2026-10-03", 4), egg("2", "2026-09-29", 5), egg("3", "2026-09-22", 6)]);
    const months = weeksByMonth(weeks);
    expect(months.map((m) => m.key)).toEqual(["2026-10", "2026-09"]);
    expect(months[0].weeks[0].totals.eggs).toBe(9);
  });
});
