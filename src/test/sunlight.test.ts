import { describe, it, expect } from "vitest";
import { getDaylightInfo, getMonthlyDaylight } from "@/lib/sunlight";

describe("Sunlight calculations", () => {
  // Munich coordinates
  const lat = 48.1351;
  const lon = 11.582;

  it("should calculate daylight info for a date", () => {
    const summer = new Date(2026, 5, 21); // June 21 = summer solstice
    const info = getDaylightInfo(summer, lat, lon);

    expect(info.daylightHours).toBeGreaterThan(15); // Munich gets ~16h daylight in summer
    expect(info.maxAltitudeDeg).toBeGreaterThan(60);
    expect(info.sunrise).toMatch(/^\d{2}:\d{2}$/);
    expect(info.sunset).toMatch(/^\d{2}:\d{2}$/);
  });

  it("should have more daylight in summer than winter", () => {
    const summer = getDaylightInfo(new Date(2026, 5, 21), lat, lon);
    const winter = getDaylightInfo(new Date(2026, 11, 21), lat, lon);

    expect(summer.daylightHours).toBeGreaterThan(winter.daylightHours);
    expect(summer.maxAltitudeDeg).toBeGreaterThan(winter.maxAltitudeDeg);
  });

  it("should calculate 12 months of daylight data", () => {
    const monthly = getMonthlyDaylight(lat, lon, 2026);
    expect(monthly).toHaveLength(12);

    // June should have most daylight
    const june = monthly[5];
    const december = monthly[11];
    expect(june.daylightHours).toBeGreaterThan(december.daylightHours);
  });
});
