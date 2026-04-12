import { describe, it, expect } from "vitest";
import plantsData from "@/data/plants.json";
import { plantFamilyMap } from "@/data/plantFamilies";
import type { Plant } from "@/types/plant";

const plants = plantsData as Plant[];

describe("Plant families", () => {
  it("every plant in catalog should have a family mapping", () => {
    for (const p of plants) {
      expect(
        plantFamilyMap[p.id],
        `Plant "${p.id}" is missing from plantFamilyMap`
      ).toBeTruthy();
    }
  });
});
