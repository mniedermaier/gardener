import { describe, it, expect } from "vitest";
import { recommendBedPlanting, getRecommendedPlants } from "@/lib/bedRecommendation";
import plantsData from "@/data/plants.json";
import type { Plant } from "@/types/plant";
import type { Bed } from "@/types/garden";

const plants = plantsData as Plant[];

function makeBed(width = 6, height = 4, envType: Bed["environmentType"] = "outdoor_bed"): Bed {
  return {
    id: "b1", name: "Test", x: 0, y: 0, width, height,
    environmentType: envType, cells: [],
  };
}

describe("Bed recommendation engine", () => {
  it("should recommend plants for an empty bed", () => {
    const bed = makeBed();
    const cells = recommendBedPlanting(bed, plants, {
      gridCellSizeCm: 30,
      lastFrostDate: "2026-05-15",
    });
    expect(cells.length).toBeGreaterThan(0);
    // Should have diverse plants
    const uniquePlants = new Set(cells.map((c) => c.plantId));
    expect(uniquePlants.size).toBeGreaterThan(1);
  });

  it("should not place antagonists adjacent", () => {
    const bed = makeBed();
    const cells = recommendBedPlanting(bed, plants, {
      gridCellSizeCm: 30,
      lastFrostDate: "2026-05-15",
    });
    const plantMap = new Map(plants.map((p) => [p.id, p]));

    for (const cell of cells) {
      const plant = plantMap.get(cell.plantId);
      if (!plant) continue;
      for (const other of cells) {
        if (cell === other) continue;
        if (Math.abs(cell.cellX - other.cellX) <= 1 && Math.abs(cell.cellY - other.cellY) <= 1) {
          expect(
            plant.antagonists.includes(other.plantId),
            `${cell.plantId} at (${cell.cellX},${cell.cellY}) is antagonist to ${other.plantId} at (${other.cellX},${other.cellY})`
          ).toBe(false);
        }
      }
    }
  });

  it("should produce recommendations list", () => {
    const bed = makeBed();
    const recs = getRecommendedPlants(bed, plants, {
      gridCellSizeCm: 30,
      lastFrostDate: "2026-05-15",
    });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].score).toBeGreaterThan(0);
  });

  it("should prefer herbs for windowsill", () => {
    const bed = makeBed(3, 2, "windowsill");
    const recs = getRecommendedPlants(bed, plants, {
      gridCellSizeCm: 30,
      lastFrostDate: "2026-05-15",
    });
    const herbCount = recs.filter((r) => r.plant.category === "herb").length;
    expect(herbCount).toBeGreaterThan(0);
  });
});
