import { describe, it, expect } from "vitest";
import { analyzeNeighbours, getCellConflicts, getPlacementHints } from "@/lib/placementValidation";
import { getPlantableNow } from "@/lib/advisor";
import plantsData from "@/data/plants.json";
import type { Plant } from "@/types/plant";
import type { Bed } from "@/types/garden";

const plants = plantsData as Plant[];
const plantMap = new Map(plants.map((p) => [p.id, p]));

function bed(cells: Array<[number, number, string]>, paths: string[] = []): Bed {
  return {
    id: "b", name: "B", x: 0, y: 0, width: 5, height: 4, environmentType: "outdoor_bed", paths,
    cells: cells.map(([cellX, cellY, plantId]) => ({ cellX, cellY, plantId })),
  };
}

describe("analyzeNeighbours", () => {
  it("only counts directly adjacent antagonists, once per pair", () => {
    // tomato and cucumber are antagonists; (0,0)-(1,0) touch, (0,0)-(3,0) do not
    const b = bed([[0, 0, "tomato"], [1, 0, "cucumber"], [3, 0, "cucumber"]]);
    const { conflicts } = analyzeNeighbours(b, plantMap);
    expect(conflicts).toHaveLength(1);
    const map = getCellConflicts(conflicts);
    expect(map.get("0-0")?.sides).toEqual(["right"]);
    expect(map.get("1-0")?.sides).toEqual(["left"]);
    expect(map.has("3-0")).toBe(false);
  });

  it("marks diagonal conflicts without an edge", () => {
    const map = getCellConflicts(analyzeNeighbours(bed([[0, 0, "tomato"], [1, 1, "cucumber"]]), plantMap).conflicts);
    expect(map.get("0-0")).toMatchObject({ sides: [], diagonal: true, partners: ["cucumber"] });
  });

  it("counts companion pairs", () => {
    expect(analyzeNeighbours(bed([[0, 0, "tomato"], [1, 0, "basil"]]), plantMap).companionPairs).toBe(1);
  });
});

describe("getPlacementHints", () => {
  it("flags free cells next to an antagonist as bad and next to a companion as good", () => {
    const hints = getPlacementHints("cucumber", bed([[0, 0, "tomato"]], ["4-3"]), plantMap);
    expect(hints.get("1-0")).toBe("bad");
    expect(hints.get("1-1")).toBe("bad");
    expect(hints.has("3-3")).toBe(false);
    expect(hints.has("4-3")).toBe(false); // path
    const good = getPlacementHints("basil", bed([[0, 0, "tomato"]]), plantMap);
    expect(good.get("1-0")).toBe("good");
  });
});

describe("getPlantableNow", () => {
  it("suggests garlic and bare-root berries in October, not tomatoes", () => {
    const ids = getPlantableNow(plants, "2026-05-15", { now: new Date(2026, 9, 5) }).map((r) => r.plantId);
    expect(ids).toContain("garlic");
    expect(ids).toContain("currant");
    expect(ids).not.toContain("tomato");
  });

  it("uses this year's frost date even if the stored one is older", () => {
    const may = getPlantableNow(plants, "2024-05-15", { now: new Date(2026, 5, 1) }).map((r) => r.plantId);
    expect(may).toContain("tomato"); // transplant 2 weeks after last frost
  });

  it("extends autumn sowing under protection", () => {
    const open = getPlantableNow(plants, "2026-05-15", { now: new Date(2026, 9, 20) }).map((r) => r.plantId);
    const glass = getPlantableNow(plants, "2026-05-15", { now: new Date(2026, 9, 20), frostProtectionWeeks: 4 }).map((r) => r.plantId);
    expect(open).not.toContain("spinach");
    expect(glass).toContain("spinach");
  });
});
