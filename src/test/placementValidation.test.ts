import { describe, it, expect } from "vitest";
import { validatePlacement, calculateBedScore } from "@/lib/placementValidation";
import type { Plant } from "@/types/plant";
import type { Bed } from "@/types/garden";

const tomato: Plant = {
  id: "tomato", category: "vegetable", sowIndoorsWeeks: -8, sowOutdoorsWeeks: null,
  transplantWeeks: 2, harvestDaysMin: 60, harvestDaysMax: 85, spacingCm: 50,
  rowSpacingCm: 70, sunRequirement: "full", waterNeed: "high",
  companions: ["basil", "carrot"], antagonists: ["potato", "cucumber"],
  color: "#ef4444", icon: "\ud83c\udf45",
};

const potato: Plant = {
  id: "potato", category: "vegetable", sowIndoorsWeeks: null, sowOutdoorsWeeks: -2,
  transplantWeeks: null, harvestDaysMin: 70, harvestDaysMax: 120, spacingCm: 35,
  rowSpacingCm: 70, sunRequirement: "full", waterNeed: "medium",
  companions: ["bean"], antagonists: ["tomato"],
  color: "#a16207", icon: "\ud83e\udd54",
};

const basil: Plant = {
  id: "basil", category: "herb", sowIndoorsWeeks: -6, sowOutdoorsWeeks: 2,
  transplantWeeks: 2, harvestDaysMin: 30, harvestDaysMax: 60, spacingCm: 25,
  rowSpacingCm: 30, sunRequirement: "full", waterNeed: "medium",
  companions: ["tomato"], antagonists: [],
  color: "#16a34a", icon: "\ud83c\udf3f",
};

const plantMap = new Map<string, Plant>([
  ["tomato", tomato], ["potato", potato], ["basil", basil],
]);

function makeBed(cells: Array<{ cellX: number; cellY: number; plantId: string }> = []): Bed {
  return {
    id: "b1", name: "Test", x: 0, y: 0, width: 6, height: 4,
    environmentType: "outdoor_bed", cells,
  };
}

describe("Placement validation", () => {
  it("should detect direct antagonist placement", () => {
    const bed = makeBed([{ cellX: 1, cellY: 0, plantId: "potato" }]);
    const result = validatePlacement("tomato", 0, 0, bed, plantMap, 30);
    expect(result.antagonistCount).toBe(1);
    expect(result.issues.some((i) => i.type === "antagonist")).toBe(true);
  });

  it("should detect companion placement", () => {
    const bed = makeBed([{ cellX: 1, cellY: 0, plantId: "basil" }]);
    const result = validatePlacement("tomato", 0, 0, bed, plantMap, 30);
    expect(result.companionCount).toBe(1);
    expect(result.isRecommended).toBe(true);
  });

  it("should warn about spacing for same species", () => {
    const bed = makeBed([{ cellX: 1, cellY: 0, plantId: "tomato" }]);
    const result = validatePlacement("tomato", 0, 0, bed, plantMap, 30);
    // 30cm apart but tomato needs 50cm
    expect(result.issues.some((i) => i.type === "spacing")).toBe(true);
  });

  it("should not warn when spacing is sufficient", () => {
    const bed = makeBed([{ cellX: 3, cellY: 0, plantId: "tomato" }]);
    const result = validatePlacement("tomato", 0, 0, bed, plantMap, 30);
    // 90cm apart, tomato needs 50cm - fine
    expect(result.issues.some((i) => i.type === "spacing")).toBe(false);
  });

  it("should return clean result for empty bed", () => {
    const bed = makeBed();
    const result = validatePlacement("tomato", 0, 0, bed, plantMap, 30);
    expect(result.issues).toHaveLength(0);
    expect(result.companionCount).toBe(0);
    expect(result.antagonistCount).toBe(0);
  });
});

describe("Bed score", () => {
  it("should score 100 for all companions", () => {
    const bed = makeBed([
      { cellX: 0, cellY: 0, plantId: "tomato" },
      { cellX: 1, cellY: 0, plantId: "basil" },
    ]);
    const { score, companionPairs, antagonistPairs } = calculateBedScore(bed, plantMap);
    expect(companionPairs).toBeGreaterThan(0);
    expect(antagonistPairs).toBe(0);
    expect(score).toBe(100);
  });

  it("should score low with antagonists", () => {
    const bed = makeBed([
      { cellX: 0, cellY: 0, plantId: "tomato" },
      { cellX: 1, cellY: 0, plantId: "potato" },
    ]);
    const { antagonistPairs, score } = calculateBedScore(bed, plantMap);
    expect(antagonistPairs).toBeGreaterThan(0);
    expect(score).toBeLessThan(50);
  });
});
