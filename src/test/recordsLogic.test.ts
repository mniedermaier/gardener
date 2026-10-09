import { describe, it, expect } from "vitest";
import { assessPh, bedPhTarget, phAdvice, phStatus, targetPh, DEFAULT_PH } from "@/lib/soil";
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

describe("crop-specific lime rules", () => {
  const potatoField = ["potato", "pumpkin", "bean", "corn"]; // demo "Kartoffelacker"

  it("never recommends lime for a potato bed at pH 5.6 (scab)", () => {
    const a = assessPh(5.6, potatoField);
    expect(a.advice).toBe("limeVeto");
    expect(a.limeAverse).toEqual(["potato"]);
    expect(a.target).toEqual({ min: 5.0, max: 6.0 });
  });

  it("shows the veto as in range: same badge as any bed inside its target", () => {
    expect(phStatus(assessPh(5.6, potatoField).advice)).toBe("optimal");
    expect(phStatus("noLime")).toBe("noLime");
  });

  it("a pure potato bed at 5.6 is simply optimal", () => {
    expect(assessPh(5.6, ["potato"]).advice).toBe("optimal");
    expect(bedPhTarget(["potato"])).toEqual({ min: 5.0, max: 6.0 });
  });

  it("warns about scab risk when the potato bed is alkaline", () => {
    expect(assessPh(6.8, ["potato"]).advice).toBe("averseHigh");
  });

  it("only a little lime when even potatoes find it too acid", () => {
    expect(assessPh(4.2, ["potato"]).advice).toBe("limeLight");
  });

  it("blueberries far above their range need acidifying, not 'slightly basic'", () => {
    expect(assessPh(6.5, ["blueberry"]).advice).toBe("acidify");
    expect(assessPh(5.0, ["blueberry"]).advice).toBe("optimal");
  });

  it("flags brassicas so lime advice can mention clubroot", () => {
    const a = assessPh(6.0, ["cabbage", "kale"]);
    expect(a.advice).toBe("limeLight");
    expect(a.limeLoving).toEqual(["cabbage", "kale"]);
  });

  it("leaves beds without lime-averse crops on the shared target", () => {
    expect(assessPh(7.1, ["tomato", "pepper", "cucumber"]).advice).toBe("noLime");
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
