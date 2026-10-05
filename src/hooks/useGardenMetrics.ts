import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { useAnalysisPrefs } from "@/store/analysisPrefs";
import { usePlantMap } from "@/hooks/usePlants";
import {
  getActualProducts,
  getActualYield,
  getBalance,
  getForecastProducts,
  getForecastYield,
  getSelfSufficiency,
  resolveProductPrices,
  type Balance,
  type Period,
  type ProductTotals,
  type SeasonYield,
  type SelfSufficiency,
} from "@/lib/metrics";

export interface GardenMetrics {
  /** The period the "actual" numbers cover (calendar year or null = all time). */
  period: Period;
  householdSize: number;
  harvest: { actual: SeasonYield; forecast: SeasonYield; entryCount: number };
  animalProducts: { actual: ProductTotals; forecast: ProductTotals };
  selfSufficiency: SelfSufficiency;
  balance: Balance;
}

/**
 * All headline numbers of the garden in one place — the dashboard, the
 * self-sufficiency page, the food plan and the cost page read from here.
 *
 *   const m = useGardenMetrics();                 // current season (calendar year)
 *   formatWeight(m.harvest.actual.totalGrams)     // "Erfasst"
 *   formatWeight(m.harvest.forecast.totalGrams)   // "Prognose"
 *   formatPercent(m.selfSufficiency.forecastRatio)     // "Jahresprognose"
 *   formatPercent(m.selfSufficiency.actualRatio)       // "bisher erfasst"
 *   formatPercent(m.selfSufficiency.forecastToDateRatio ?? 0) // "erwartet bis heute"
 *   formatCurrency(m.balance.net)
 */
export function useGardenMetrics(opts: { period?: Period } = {}): GardenMetrics {
  const period = opts.period === undefined ? new Date().getFullYear() : opts.period;
  const s = useStore(
    useShallow((st) => ({
      gardens: st.gardens,
      harvests: st.harvests,
      animals: st.animals,
      animalProducts: st.animalProducts,
      expenses: st.expenses,
      feedEntries: st.feedEntries,
      healthEvents: st.healthEvents,
      gridCellSizeCm: st.gridCellSizeCm,
      lastFrostDate: st.lastFrostDate,
    })),
  );
  const { householdSize, productPrices } = useAnalysisPrefs(
    useShallow((p) => ({ householdSize: p.householdSize, productPrices: p.productPrices })),
  );
  const plantMap = usePlantMap();

  return useMemo(() => {
    const prices = resolveProductPrices(productPrices);
    return {
      period,
      householdSize,
      harvest: {
        actual: getActualYield(s.harvests, period),
        forecast: getForecastYield(s.gardens, plantMap, s.gridCellSizeCm),
        entryCount: s.harvests.filter((h) => period === null || h.date.startsWith(`${period}-`)).length,
      },
      animalProducts: { actual: getActualProducts(s.animalProducts, period), forecast: getForecastProducts(s.animals) },
      selfSufficiency: getSelfSufficiency({
        harvests: s.harvests,
        animalProducts: s.animalProducts,
        gardens: s.gardens,
        animals: s.animals,
        plants: plantMap,
        gridCellSizeCm: s.gridCellSizeCm,
        householdSize,
        period,
        lastFrostDate: s.lastFrostDate,
      }),
      balance: getBalance({
        harvests: s.harvests,
        animalProducts: s.animalProducts,
        expenses: s.expenses,
        feedEntries: s.feedEntries,
        healthEvents: s.healthEvents,
        period,
        productPrices: prices,
      }),
    };
  }, [s, plantMap, householdSize, productPrices, period]);
}
