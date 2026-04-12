import { describe, it, expect } from "vitest";
import { generateSuccessionSchedule, isSuccessionCandidate, SUCCESSION_PRESETS } from "@/lib/succession";
import type { Plant } from "@/types/plant";

const lettuce: Plant = {
  id: "lettuce", category: "vegetable", sowIndoorsWeeks: -6, sowOutdoorsWeeks: -4,
  transplantWeeks: -2, harvestDaysMin: 30, harvestDaysMax: 60, spacingCm: 25,
  rowSpacingCm: 30, sunRequirement: "partial", waterNeed: "medium",
  companions: [], antagonists: [], color: "#84cc16", icon: "🥬",
};

describe("Succession planting", () => {
  it("should identify succession candidates", () => {
    expect(isSuccessionCandidate(lettuce)).toBe(true);
    expect(isSuccessionCandidate({ ...lettuce, id: "tomato" })).toBe(false);
  });

  it("should have presets for common crops", () => {
    expect(SUCCESSION_PRESETS.lettuce).toBeDefined();
    expect(SUCCESSION_PRESETS.radish).toBeDefined();
    expect(SUCCESSION_PRESETS.spinach).toBeDefined();
  });

  it("should generate correct number of sowings", () => {
    const schedule = generateSuccessionSchedule({
      plantId: "lettuce",
      intervalWeeks: 3,
      numberOfSowings: 5,
      startWeeksRelativeToFrost: -4,
    }, "2026-05-15");

    expect(schedule).toHaveLength(5);
    expect(schedule[0].sowingNumber).toBe(1);
    expect(schedule[4].sowingNumber).toBe(5);
  });

  it("should space sowings by interval", () => {
    const schedule = generateSuccessionSchedule({
      plantId: "radish",
      intervalWeeks: 2,
      numberOfSowings: 3,
      startWeeksRelativeToFrost: -6,
    }, "2026-05-15");

    // Dates should be 2 weeks apart
    const dates = schedule.map((s) => new Date(s.date).getTime());
    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
    expect(dates[1] - dates[0]).toBe(twoWeeksMs);
    expect(dates[2] - dates[1]).toBe(twoWeeksMs);
  });
});
