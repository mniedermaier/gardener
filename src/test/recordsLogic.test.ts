import { describe, it, expect } from "vitest";
import { phAdvice, targetPh, DEFAULT_PH } from "@/lib/soil";
import { needsNewStock, propagation, seedViability } from "@/lib/seedViability";
import plants from "@/data/plants.json";
import type { Plant } from "@/types/plant";

const plant = (id: string) => (plants as Plant[]).find((p) => p.id === id)!;

describe("soil pH advice", () => {
  it("does not recommend sulphur for near-neutral soil", () => {
    expect(phAdvice(7.1, targetPh(["tomato", "pepper", "cucumber"]))).toBe("noLime");
    expect(phAdvice(7.1)).toBe("noLime");
  });
  it("recommends sulphur only when clearly alkaline and above target", () => {
    expect(phAdvice(7.8, DEFAULT_PH)).toBe("sulfur");
    expect(phAdvice(7.6, targetPh(["cabbage"]))).toBe("noLime");
  });
  it("recommends lime only below the target", () => {
    expect(phAdvice(5.6, DEFAULT_PH)).toBe("limeLight");
    expect(phAdvice(5.2, DEFAULT_PH)).toBe("limeStrong");
    expect(phAdvice(6.5, DEFAULT_PH)).toBe("optimal");
    // Blueberries want acid soil: 5.0 is fine, no lime.
    expect(phAdvice(5.0, targetPh(["blueberry"]))).toBe("optimal");
  });
});

describe("seed viability", () => {
  it("potatoes are planting stock, not seed", () => {
    expect(propagation(plant("potato"))).toBe("vegetative");
    expect(seedViability(plant("potato"), 2020, 2026).status).toBe("notApplicable");
  });
  it("old seed gets a germination test, not 'expired'", () => {
    expect(seedViability(plant("carrot"), 2022, 2026).status).toBe("testRecommended");
    expect(seedViability(plant("carrot"), 2025, 2026).status).toBe("good");
  });
  it("perennial herbs are not on the seed shopping list", () => {
    expect(needsNewStock(plant("rosemary"))).toBe(false);
    expect(needsNewStock(plant("thyme"))).toBe(false);
    expect(needsNewStock(plant("tomato"))).toBe(true);
  });
});
