import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/persistStorage";
import type { ProductType } from "@/types/animal";

/**
 * Small preference store for the analysis pages (self-sufficiency, food plan,
 * costs). Kept apart from the main store on purpose: these are view settings,
 * not garden records, so they are not part of backups and need no migration.
 *
 * - householdSize: one value shared by Selbstversorgung, Ernährungsplan and
 *   the dashboard metrics (before, each page had its own field).
 * - productPrices: overrides for the default animal-product prices used in
 *   the cost/yield balance (`DEFAULT_PRODUCT_PRICES` in lib/metrics.ts).
 */
export interface AnalysisPrefs {
  householdSize: number;
  productPrices: Partial<Record<ProductType, number>>;
  setHouseholdSize: (size: number) => void;
  setProductPrice: (type: ProductType, price: number | null) => void;
}

export const clampHouseholdSize = (n: number) => Math.min(20, Math.max(1, Math.round(Number.isFinite(n) ? n : 1)));

export const useAnalysisPrefs = create<AnalysisPrefs>()(
  persist(
    (set) => ({
      householdSize: 2,
      productPrices: {},
      setHouseholdSize: (size) => set({ householdSize: clampHouseholdSize(size) }),
      setProductPrice: (type, price) =>
        set((s) => {
          const next = { ...s.productPrices };
          if (price === null || !Number.isFinite(price) || price < 0) delete next[type];
          else next[type] = price;
          return { productPrices: next };
        }),
    }),
    {
      name: "gardener-analysis-prefs",
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({ householdSize: s.householdSize, productPrices: s.productPrices }),
    },
  ),
);
