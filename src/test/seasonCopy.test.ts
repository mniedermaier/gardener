import { describe, it, expect } from "vitest";
import { frostAdviceKey } from "@/components/weather/frost";
import { shareTokenFromText } from "@/components/planner/ImportPage";
import { encodeGardenToUrl, decodeGardenFromUrl } from "@/lib/sharing";
import type { Garden } from "@/types/garden";

describe("frostAdviceKey", () => {
  it("advises waiting to plant out in spring", () => {
    expect(frostAdviceKey(false, new Date(2026, 3, 20))).toBe("alerts.frostAdviceNoPlants");
    expect(frostAdviceKey(true, new Date(2026, 4, 2))).toBe("alerts.frostAdvice");
  });

  it("never gives spring advice in autumn", () => {
    expect(frostAdviceKey(false, new Date(2026, 9, 9))).toBe("alerts.frostAdviceAutumnNoPlants");
    expect(frostAdviceKey(true, new Date(2026, 10, 1))).toBe("alerts.frostAdviceAutumn");
  });
});

describe("shareTokenFromText", () => {
  const garden = { id: "g", name: "Hof", beds: [], createdAt: "2026-01-01" } as unknown as Garden;
  const token = encodeGardenToUrl(garden);

  it("takes the t parameter of a full share URL", () => {
    const pasted = `https://example.org/gardener/#/import?t=${token}`;
    expect(shareTokenFromText(pasted)).toBe(token);
    expect(decodeGardenFromUrl(shareTokenFromText(pasted)!)?.name).toBe("Hof");
  });

  it("accepts a URL-encoded token and surrounding whitespace", () => {
    expect(shareTokenFromText(`  https://x/#/import?t=${encodeURIComponent(token)}&utm=1 `)).toBe(token);
  });

  it("accepts the bare token and rejects text with spaces", () => {
    expect(shareTokenFromText(token)).toBe(token);
    expect(shareTokenFromText("look at my garden")).toBeNull();
    expect(shareTokenFromText("   ")).toBeNull();
  });
});
