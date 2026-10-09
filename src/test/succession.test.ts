import { describe, it, expect } from "vitest";
import { generateSuccessionSchedule, isSuccessionCandidate, successionSeason, SUCCESSION_PRESETS } from "@/lib/succession";
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

describe("successionSeason", () => {
  const radish: Plant = { ...lettuce, id: "radish", sowIndoorsWeeks: null, sowOutdoorsWeeks: -4, transplantWeeks: null };
  const tomato: Plant = { ...lettuce, id: "tomato" };

  it("offers this year's candidates while a sowing is still ahead", () => {
    // Frost 15 May; radish: 8 sowings every 2 weeks from 17 Apr → last on 24 Jul.
    const s = successionSeason([lettuce, radish, tomato], "2026-05-15", new Date(2026, 5, 1));
    expect(s.nextYear).toBe(false);
    expect(s.frostISO).toBe("2026-05-15");
    expect(s.open.map((p) => p.id).sort()).toEqual(["lettuce", "radish"]);
  });

  it("drops crops whose last sowing has passed", () => {
    // 1 Aug: radish ended 24 Jul; lettuce (6 × 3 weeks from 17 Apr) runs to 31 Jul — both closed.
    const s = successionSeason([lettuce, radish], "2026-05-15", new Date(2026, 7, 1));
    expect(s.nextYear).toBe(true);
  });

  it("plans next spring in autumn instead of offering closed windows", () => {
    const s = successionSeason([lettuce, radish], "2026-05-15", new Date(2026, 9, 9));
    expect(s.nextYear).toBe(true);
    expect(s.frostISO).toBe("2027-05-15");
    expect(s.open).toHaveLength(2);
  });

  it("ignores a stale year in the stored frost date", () => {
    const s = successionSeason([lettuce], "2023-05-15", new Date(2026, 5, 1));
    expect(s.frostISO).toBe("2026-05-15");
  });
});
