import { describe, it, expect } from "vitest";
import { getFrostProtectionWeeks, ENVIRONMENT_ICONS, type Bed } from "@/types/garden";

function makeBed(overrides: Partial<Bed> = {}): Bed {
  return {
    id: "test",
    name: "Test Bed",
    x: 0,
    y: 0,
    width: 4,
    height: 3,
    cells: [],
    environmentType: "outdoor_bed",
    ...overrides,
  };
}

describe("Environment types", () => {
  it("every environment type should have an icon", () => {
    const types = [
      "outdoor_bed", "raised_bed", "greenhouse", "cold_frame",
      "polytunnel", "container", "windowsill", "vertical",
    ] as const;
    for (const t of types) {
      expect(ENVIRONMENT_ICONS[t]).toBeTruthy();
    }
  });

  it("outdoor bed should have 0 frost protection", () => {
    const bed = makeBed({ environmentType: "outdoor_bed" });
    expect(getFrostProtectionWeeks(bed)).toBe(0);
  });

  it("raised bed should have 1 week frost protection", () => {
    const bed = makeBed({ environmentType: "raised_bed" });
    expect(getFrostProtectionWeeks(bed)).toBe(1);
  });

  it("greenhouse should use config frost protection", () => {
    const bed = makeBed({
      environmentType: "greenhouse",
      greenhouseConfig: {
        material: "glass",
        heated: true,
        heatingType: "electric",
        ventilation: "automatic",
        minTempC: 5,
        maxTempC: 35,
        frostProtectionWeeks: 6,
      },
    });
    expect(getFrostProtectionWeeks(bed)).toBe(6);
  });

  it("greenhouse without config should return 0", () => {
    const bed = makeBed({ environmentType: "greenhouse" });
    expect(getFrostProtectionWeeks(bed)).toBe(0);
  });

  it("cold frame should use config frost protection", () => {
    const bed = makeBed({
      environmentType: "cold_frame",
      coldFrameConfig: { frostProtectionWeeks: 3 },
    });
    expect(getFrostProtectionWeeks(bed)).toBe(3);
  });

  it("polytunnel should have 3 weeks frost protection", () => {
    const bed = makeBed({ environmentType: "polytunnel" });
    expect(getFrostProtectionWeeks(bed)).toBe(3);
  });

  it("windowsill should have 8 weeks frost protection", () => {
    const bed = makeBed({ environmentType: "windowsill" });
    expect(getFrostProtectionWeeks(bed)).toBe(8);
  });
});
