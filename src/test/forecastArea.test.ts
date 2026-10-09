import { describe, it, expect } from "vitest";
import { bedForecastKg, bedPlantAreas, getForecastYield, plantAreaM2, plantYieldKg } from "@/lib/metrics";
import { calculateSufficiency } from "@/lib/sufficiency";
import type { Plant } from "@/types/plant";
import type { Bed, Garden } from "@/types/garden";

const plant = (id: string, spacingCm: number, rowSpacingCm: number, kgPerM2: number): Plant => ({
  id, category: "vegetable", sowIndoorsWeeks: null, sowOutdoorsWeeks: 0, transplantWeeks: null,
  harvestDaysMin: 60, harvestDaysMax: 90, spacingCm, rowSpacingCm, sunRequirement: "full",
  waterNeed: "medium", companions: [], antagonists: [], color: "#000", icon: "",
  expectedYieldKgPerM2: kgPerM2, caloriesPer100g: 20,
});
// Tomato 50 × 70 cm at 8 kg/m² → 0,35 m², 2,8 kg per plant. Radish 5 × 15 cm stays one 30 cm cell.
const tomato = plant("tomato", 50, 70, 8);
const radish = plant("radish", 5, 15, 2);
const map = new Map([tomato, radish].map((p) => [p.id, p]));

const bed = (width: number, height: number, cells: string[]): Bed => ({
  id: `b${width}x${height}`, name: "B", x: 0, y: 0, width, height, environmentType: "outdoor_bed",
  cells: cells.map((plantId, i) => ({ cellX: i % width, cellY: Math.floor(i / width), plantId })),
});
const garden = (...beds: Bed[]): Garden => ({ id: "g", name: "G", season: "2026", createdAt: "", updatedAt: "", beds });

describe("forecast growing area", () => {
  it("credits a placed plant its spacing area, at least one cell", () => {
    expect(plantAreaM2(tomato, 30)).toBeCloseTo(0.35);
    expect(plantAreaM2(radish, 30)).toBeCloseTo(0.09);
    expect(plantYieldKg(tomato, 30)).toBeCloseTo(2.8);
  });

  it("uses the spacing area while the bed has room for it", () => {
    // 2 tomatoes in a 3 × 3 m-sized bed (10 × 10 cells of 30 cm = 9 m²): no crowding.
    const roomy = bed(10, 10, ["tomato", "tomato"]);
    expect(bedForecastKg(roomy, map, 30)).toBeCloseTo(5.6);
    expect(getForecastYield([garden(roomy)], map, 30).byPlant.tomato).toBeCloseTo(5600);
  });

  it("never credits a bed more area than it has", () => {
    // 8 tomatoes in 2 × 4 cells (0,72 m²) would claim 2,8 m²: scaled to the bed.
    const crowded = bed(2, 4, Array(8).fill("tomato"));
    const areas = bedPlantAreas(crowded, map, 30);
    expect(areas.reduce((s, a) => s + a.areaM2, 0)).toBeCloseTo(0.72);
    expect(bedForecastKg(crowded, map, 30)).toBeCloseTo(0.72 * 8);
  });

  it("paths do not count as growing area", () => {
    const withPath: Bed = { ...bed(2, 4, Array(6).fill("tomato")), paths: ["0-3", "1-3"] };
    expect(bedPlantAreas(withPath, map, 30).reduce((s, a) => s + a.areaM2, 0)).toBeCloseTo(0.54);
  });

  it("the sufficiency forecast uses the same yield as getForecastYield", () => {
    const g = garden(bed(10, 10, ["tomato", "tomato", "radish"]));
    const forecastKg = getForecastYield([g], map, 30).totalGrams / 1000;
    const result = calculateSufficiency([g], [tomato, radish], 2, 30);
    const tomatoYield = result.plantYields.find((y) => y.plantId === "tomato");
    expect(tomatoYield?.estimatedKg).toBeCloseTo(5.6);
    expect(forecastKg).toBeCloseTo(5.6 + 0.18);
  });
});
