import { differenceInCalendarDays, subDays } from "date-fns";
import { toDate } from "@/lib/format";
import type { ProductTotals } from "@/lib/metrics";
import { ANNUAL_YIELD, type Animal, type AnimalProduct, type ProductType } from "@/types/animal";

const ORDER: ProductType[] = ["eggs", "honey", "milk", "wool", "meat", "wax"];

/**
 * Products worth a key figure: what the current herd typically yields
 * (eggs for hens, honey for bees, milk for goats …) plus anything actually
 * recorded this year. No "Milch 0 l" without dairy animals.
 */
export function herdProductTypes(animals: Animal[], yearTotals: ProductTotals): ProductType[] {
  const types = new Set<ProductType>();
  for (const a of animals) for (const y of ANNUAL_YIELD[a.type] ?? []) if (y.product !== "wax" && y.product !== "meat") types.add(y.product);
  for (const ty of ORDER) if ((yearTotals[ty] ?? 0) > 0) types.add(ty);
  return ORDER.filter((ty) => types.has(ty));
}

/**
 * Eggs per rolling 7-day window for the last `weeks` windows, oldest first;
 * the last one ends today. Rolling, not calendar weeks: on a Friday "this
 * week" would only hold five days and read like a collapse in laying.
 */
export function weeklyEggs(products: AnimalProduct[], now: Date, weeks = 8): number[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const first = subDays(today, 7 * weeks - 1);
  const out: number[] = Array.from({ length: weeks }, () => 0);
  for (const p of products) {
    if (p.type !== "eggs") continue;
    const d = toDate(p.date);
    if (!d || d < first || d > today) continue;
    const i = Math.floor(differenceInCalendarDays(d, first) / 7);
    if (i >= 0 && i < weeks) out[i] += p.quantity;
  }
  return out;
}
