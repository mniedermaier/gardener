import { describe, it, expect } from "vitest";
import {
  detectFrostAlerts,
  detectGreenhouseAlerts,
  generateWateringAdvice,
  generateWeeklySummary,
  getAllAlerts,
} from "@/lib/weatherAlerts";
import type { WeatherForecastItem } from "@/types/weather";
import type { Bed } from "@/types/garden";
import type { Plant } from "@/types/plant";

const makeForecast = (overrides: Partial<WeatherForecastItem> = {}): WeatherForecastItem => ({
  date: "2026-05-01",
  tempMin: 10,
  tempMax: 20,
  description: "cloudy",
  icon: "04d",
  precipitation: 30,
  ...overrides,
});

describe("Frost alerts", () => {
  it("should detect frost when tempMin <= threshold", () => {
    const forecast = [makeForecast({ tempMin: 1, date: "2026-04-10" })];
    const alerts = detectFrostAlerts(forecast, 2);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe("frost");
    expect(alerts[0].severity).toBe("warning");
  });

  it("should be danger when tempMin <= 0", () => {
    const forecast = [makeForecast({ tempMin: -2 })];
    const alerts = detectFrostAlerts(forecast, 2);
    expect(alerts[0].severity).toBe("danger");
  });

  it("should not alert when above threshold", () => {
    const forecast = [makeForecast({ tempMin: 5 })];
    const alerts = detectFrostAlerts(forecast, 2);
    expect(alerts).toHaveLength(0);
  });
});

describe("Greenhouse alerts", () => {
  const ghBed: Bed = {
    id: "gh1", name: "Greenhouse", x: 0, y: 0, width: 4, height: 3, cells: [],
    environmentType: "greenhouse",
    greenhouseConfig: {
      material: "glass", heated: false, ventilation: "manual",
      minTempC: 5, maxTempC: 35, frostProtectionWeeks: 4,
    },
  };

  it("should alert when forecast exceeds maxTemp", () => {
    const forecast = [makeForecast({ tempMax: 36 })];
    const alerts = detectGreenhouseAlerts(forecast, [ghBed]);
    expect(alerts.some((a) => a.type === "greenhouse_hot")).toBe(true);
  });

  it("should alert when forecast drops below minTemp (unheated)", () => {
    const forecast = [makeForecast({ tempMin: 3 })];
    const alerts = detectGreenhouseAlerts(forecast, [ghBed]);
    expect(alerts.some((a) => a.type === "greenhouse_cold")).toBe(true);
  });

  it("should not alert for outdoor beds", () => {
    const outdoorBed: Bed = { ...ghBed, environmentType: "outdoor_bed", greenhouseConfig: undefined };
    const forecast = [makeForecast({ tempMax: 40 })];
    const alerts = detectGreenhouseAlerts(forecast, [outdoorBed]);
    expect(alerts).toHaveLength(0);
  });
});

describe("Watering advice", () => {
  const highWaterPlant: Plant = {
    id: "tomato", category: "vegetable", sowIndoorsWeeks: -8, sowOutdoorsWeeks: null,
    transplantWeeks: 2, harvestDaysMin: 60, harvestDaysMax: 85, spacingCm: 50,
    rowSpacingCm: 70, sunRequirement: "full", waterNeed: "high",
    companions: [], antagonists: [], color: "#ef4444", icon: "🍅",
  };

  it("should recommend watering when hot and dry", () => {
    const forecast = [
      makeForecast({ tempMax: 30, precipitation: 10 }),
      makeForecast({ tempMax: 32, precipitation: 5 }),
      makeForecast({ tempMax: 28, precipitation: 0 }),
    ];
    const alerts = generateWateringAdvice(forecast, [highWaterPlant]);
    expect(alerts.some((a) => a.titleKey === "alerts.wateringNeeded")).toBe(true);
  });

  it("should say no watering when rain expected", () => {
    const forecast = [
      makeForecast({ precipitation: 80 }),
      makeForecast({ precipitation: 70 }),
      makeForecast({ precipitation: 60 }),
    ];
    const alerts = generateWateringAdvice(forecast, [highWaterPlant]);
    expect(alerts.some((a) => a.titleKey === "alerts.wateringNotNeeded")).toBe(true);
  });
});

describe("Weekly summary", () => {
  it("should generate frost summary when cold", () => {
    const forecast = [makeForecast({ tempMin: -1, tempMax: 8 })];
    const config = { frostAlertEnabled: true, frostThresholdC: 2, wateringReminders: true, greenhouseAlerts: true, weeklyDigest: true };
    const alerts = generateWeeklySummary(forecast, config);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].descriptionKey).toBe("alerts.weeklySummaryFrost");
  });

  it("should not generate when disabled", () => {
    const forecast = [makeForecast()];
    const config = { frostAlertEnabled: true, frostThresholdC: 2, wateringReminders: true, greenhouseAlerts: true, weeklyDigest: false };
    const alerts = generateWeeklySummary(forecast, config);
    expect(alerts).toHaveLength(0);
  });
});

describe("getAllAlerts", () => {
  it("should combine all alert types", () => {
    const forecast = [makeForecast({ tempMin: 0, tempMax: 30, precipitation: 5 })];
    const config = { frostAlertEnabled: true, frostThresholdC: 2, wateringReminders: true, greenhouseAlerts: true, weeklyDigest: true };
    const alerts = getAllAlerts(forecast, [], [], config);
    // Should have weekly summary + frost alert at minimum
    expect(alerts.length).toBeGreaterThanOrEqual(2);
  });
});
