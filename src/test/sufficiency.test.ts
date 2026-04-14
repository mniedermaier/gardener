import { describe, it, expect } from "vitest";
import { calculatePlantYield, calculateSufficiency, estimatePlantArea } from "@/lib/sufficiency";
import type { Plant } from "@/types/plant";
import type { Garden } from "@/types/garden";

const tomato: Plant = {
  id: "tomato", category: "vegetable", sowIndoorsWeeks: -8, sowOutdoorsWeeks: null,
  transplantWeeks: 2, harvestDaysMin: 60, harvestDaysMax: 85, spacingCm: 50,
  rowSpacingCm: 70, sunRequirement: "full", waterNeed: "high",
  companions: [], antagonists: [], color: "#ef4444", icon: "\ud83c\udf45",
  caloriesPer100g: 18, proteinPer100g: 0.9, vitaminCPer100g: 14, fiberPer100g: 1.2,
  expectedYieldKgPerM2: 8, preservationMethods: ["canning", "freezing"],
};

const bean: Plant = {
  id: "bean", category: "vegetable", sowIndoorsWeeks: null, sowOutdoorsWeeks: 2,
  transplantWeeks: null, harvestDaysMin: 50, harvestDaysMax: 65, spacingCm: 10,
  rowSpacingCm: 40, sunRequirement: "full", waterNeed: "medium",
  companions: [], antagonists: [], color: "#16a34a", icon: "\ud83e\udeda",
  caloriesPer100g: 31, proteinPer100g: 1.8, vitaminCPer100g: 12, fiberPer100g: 2.7,
  expectedYieldKgPerM2: 2,
};

const garden: Garden = {
  id: "g1", name: "Test", season: "2026",
  beds: [{
    id: "b1", name: "Bed 1", x: 0, y: 0, width: 4, height: 3,
    environmentType: "outdoor_bed",
    cells: [
      { cellX: 0, cellY: 0, plantId: "tomato" },
      { cellX: 1, cellY: 0, plantId: "tomato" },
      { cellX: 2, cellY: 0, plantId: "bean" },
      { cellX: 3, cellY: 0, plantId: "bean" },
      { cellX: 0, cellY: 1, plantId: "bean" },
    ],
  }],
  createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

describe("Sufficiency calculator", () => {
  it("should estimate plant area correctly", () => {
    const area = estimatePlantArea([garden], "tomato", 30);
    // 2 cells * (0.3m)^2 = 0.18 m2
    expect(area).toBeCloseTo(0.18, 2);
  });

  it("should calculate plant yield", () => {
    const result = calculatePlantYield(tomato, 1.0);
    expect(result.estimatedKg).toBe(8);
    expect(result.calories).toBeGreaterThan(0);
    expect(result.proteinG).toBeGreaterThan(0);
  });

  it("should calculate zero yield for zero area", () => {
    const result = calculatePlantYield(tomato, 0);
    expect(result.estimatedKg).toBe(0);
    expect(result.calories).toBe(0);
  });

  it("should calculate full sufficiency result", () => {
    const result = calculateSufficiency([garden], [tomato, bean], 2, 30);
    expect(result.plantYields).toHaveLength(2);
    expect(result.totalYieldKg).toBeGreaterThan(0);
    expect(result.nutrition.calories.percent).toBeGreaterThanOrEqual(0);
    expect(result.nutrition.protein.percent).toBeGreaterThanOrEqual(0);
  });

  it("should have higher coverage for smaller families", () => {
    // Use a bigger garden so we get non-zero percentages
    const bigGarden: Garden = {
      ...garden,
      beds: [{
        ...garden.beds[0],
        width: 20, height: 20,
        cells: Array.from({ length: 200 }, (_, i) => ({
          cellX: i % 20, cellY: Math.floor(i / 20), plantId: i < 100 ? "tomato" : "bean",
        })),
      }],
    };
    const small = calculateSufficiency([bigGarden], [tomato, bean], 1, 30);
    const large = calculateSufficiency([bigGarden], [tomato, bean], 10, 30);
    expect(small.nutrition.calories.percent).toBeGreaterThan(large.nutrition.calories.percent);
  });

  it("should return empty for no gardens", () => {
    const result = calculateSufficiency([], [tomato, bean], 2, 30);
    expect(result.plantYields).toHaveLength(0);
    expect(result.totalYieldKg).toBe(0);
  });

  it("should include animal yields when animals are passed", () => {
    const animals = [
      { id: "a1", type: "chicken" as const, count: 5, acquiredDate: "2026-01-01" },
    ];
    const result = calculateSufficiency([], [tomato, bean], 2, 30, "2026-05-15", animals);
    expect(result.animalYields.length).toBeGreaterThan(0);
    // 5 chickens * 250 eggs * 0.06 kg/egg = 75 kg
    const eggYield = result.animalYields.find((y) => y.productType === "eggs");
    expect(eggYield).toBeDefined();
    expect(eggYield!.quantityKg).toBe(75);
    expect(eggYield!.calories).toBeGreaterThan(0);
    expect(eggYield!.proteinG).toBeGreaterThan(0);
    expect(result.totalYieldKg).toBeGreaterThan(0);
  });

  it("should have monthly food distribution with values in harvest months", () => {
    const result = calculateSufficiency([garden], [tomato, bean], 2, 30);
    expect(result.monthlyFood).toHaveLength(12);
    // Each month should have caloriesNeeded > 0
    for (const m of result.monthlyFood) {
      expect(m.caloriesNeeded).toBeGreaterThan(0);
    }
    // At least some months should have non-zero food production
    const monthsWithFood = result.monthlyFood.filter((m) => m.calories > 0);
    expect(monthsWithFood.length).toBeGreaterThan(0);
  });

  it("should return zero animal yields when no animals passed", () => {
    const result = calculateSufficiency([garden], [tomato, bean], 2, 30);
    expect(result.animalYields).toHaveLength(0);
  });
});
