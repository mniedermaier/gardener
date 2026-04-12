import { describe, it, expect } from "vitest";
import plantsData from "@/data/plants.json";
import type { Plant } from "@/types/plant";

const plants = plantsData as Plant[];

describe("Plant database", () => {
  it("should have at least 30 plants", () => {
    expect(plants.length).toBeGreaterThanOrEqual(30);
  });

  it("every plant should have a unique id", () => {
    const ids = plants.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every plant should have valid category", () => {
    const valid = ["vegetable", "fruit", "berry", "herb"];
    for (const p of plants) {
      expect(valid).toContain(p.category);
    }
  });

  it("every plant should have valid sun requirement", () => {
    const valid = ["full", "partial", "shade"];
    for (const p of plants) {
      expect(valid).toContain(p.sunRequirement);
    }
  });

  it("every plant should have valid water need", () => {
    const valid = ["low", "medium", "high"];
    for (const p of plants) {
      expect(valid).toContain(p.waterNeed);
    }
  });

  it("companion and antagonist references should be valid plant ids", () => {
    const ids = new Set(plants.map((p) => p.id));
    for (const p of plants) {
      for (const c of p.companions) {
        expect(ids.has(c), `${p.id} companion "${c}" not found`).toBe(true);
      }
      for (const a of p.antagonists) {
        expect(ids.has(a), `${p.id} antagonist "${a}" not found`).toBe(true);
      }
    }
  });

  it("harvest days should be positive and max >= min", () => {
    for (const p of plants) {
      expect(p.harvestDaysMin).toBeGreaterThan(0);
      expect(p.harvestDaysMax).toBeGreaterThanOrEqual(p.harvestDaysMin);
    }
  });

  it("spacing should be positive", () => {
    for (const p of plants) {
      expect(p.spacingCm).toBeGreaterThan(0);
      expect(p.rowSpacingCm).toBeGreaterThan(0);
    }
  });
});
