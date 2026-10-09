import { describe, it, expect } from "vitest";
import {
  detectFrostAlerts,
  summarizeFrost,
  detectGreenhouseAlerts,
  generateWateringAdvice,
  generateWeeklySummary,
  getAllAlerts,
  frostRiskByBed,
  frostAffectedPlants,
  isFrostSensitive,
} from "@/lib/weatherAlerts";
import plantsData from "@/data/plants.json";
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

describe("Watering advice and covered beds", () => {
  const plant: Plant = {
    id: "lettuce", category: "vegetable", sowIndoorsWeeks: -6, sowOutdoorsWeeks: -2,
    transplantWeeks: 0, harvestDaysMin: 50, harvestDaysMax: 70, spacingCm: 25,
    rowSpacingCm: 30, sunRequirement: "full", waterNeed: "medium",
    companions: [], antagonists: [], color: "#22c55e", icon: "🥬",
  };
  const rainy = [makeForecast({ precipitation: 80 }), makeForecast({ precipitation: 70 }), makeForecast({ precipitation: 60 })];
  const cell = [{ cellX: 0, cellY: 0, plantId: "lettuce" }];
  const bed = (name: string, environmentType: Bed["environmentType"], cells = cell) => ({ name, environmentType, cells });

  it("speaks of the open beds and names the covered ones when the garden has both", () => {
    const alerts = generateWateringAdvice(rainy, [plant], [bed("Hochbeet", "raised_bed"), bed("Gewächshaus", "greenhouse")]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].titleKey).toBe("alerts.wateringNotNeededOpen");
    expect(alerts[0].descriptionParams).toEqual({ beds: "Gewächshaus" });
  });

  it("gives no rain advice when only covered beds are planted", () => {
    const alerts = generateWateringAdvice(rainy, [plant], [bed("Gewächshaus", "greenhouse"), bed("Leer", "outdoor_bed", [])]);
    expect(alerts.some((a) => a.id === "watering-rain")).toBe(false);
  });

  it("keeps the plain advice for open beds only, and ignores empty covered beds", () => {
    const alerts = generateWateringAdvice(rainy, [plant], [bed("Acker", "outdoor_bed"), bed("Gewächshaus", "greenhouse", [])]);
    expect(alerts[0].titleKey).toBe("alerts.wateringNotNeeded");
  });

  it("getAllAlerts passes the beds on", () => {
    const config = { frostAlertEnabled: false, frostThresholdC: 2, wateringReminders: true, greenhouseAlerts: false, weeklyDigest: false };
    const beds = [
      { id: "a", name: "Hochbeet", x: 0, y: 0, width: 2, height: 2, environmentType: "raised_bed", cells: cell },
      { id: "b", name: "Gewächshaus", x: 0, y: 0, width: 2, height: 2, environmentType: "greenhouse", cells: cell },
    ] as Bed[];
    expect(getAllAlerts(rainy, beds, [plant], config)[0].titleKey).toBe("alerts.wateringNotNeededOpen");
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

describe("groupAlerts", () => {
  it("merges frost nights into one group, drops the weekly digest and sorts by severity", async () => {
    const { groupAlerts, detectFrostAlerts } = await import("@/lib/weatherAlerts");
    const days = [
      { date: "2026-10-06", tempMin: 2, tempMax: 10, description: "", icon: "01d", precipitation: 0 },
      { date: "2026-10-05", tempMin: -1, tempMax: 9, description: "", icon: "01d", precipitation: 0 },
      { date: "2026-10-07", tempMin: -6, tempMax: 8, description: "", icon: "01d", precipitation: 0 },
    ];
    const frost = detectFrostAlerts(days, 2);
    const groups = groupAlerts([
      { id: "weekly-summary", type: "weekly", severity: "warning", titleKey: "", descriptionKey: "" },
      { id: "watering-rain", type: "watering", severity: "info", titleKey: "", descriptionKey: "" },
      ...frost,
    ]);
    expect(groups.map((g) => g.type)).toEqual(["frost", "watering"]);
    expect(groups[0].alerts).toHaveLength(3);
    expect(groups[0].severity).toBe("danger");
    expect(groups[0].alerts.map((a) => a.date)).toEqual(["2026-10-05", "2026-10-06", "2026-10-07"]);
  });
});

describe("Greenhouse cold alert names the coldest night", () => {
  const gh: Bed = {
    id: "gh", name: "Gewächshaus", x: 0, y: 0, width: 6, height: 4, cells: [],
    environmentType: "greenhouse",
    greenhouseConfig: { material: "polycarbonate", heated: false, ventilation: "manual", minTempC: 5, maxTempC: 35, frostProtectionWeeks: 4 },
  };
  // Demo week from the review: Mo 2 °C, Di −1 °C, Mi −6 °C, Do −5 °C.
  const week = [
    makeForecast({ date: "2026-10-05", tempMin: 2, tempMax: 14 }),
    makeForecast({ date: "2026-10-06", tempMin: -1, tempMax: 12 }),
    makeForecast({ date: "2026-10-07", tempMin: -6, tempMax: 9 }),
    makeForecast({ date: "2026-10-08", tempMin: -5, tempMax: 4 }),
  ];

  it("reports the coldest day and value, not the first cold one", () => {
    const [cold] = detectGreenhouseAlerts(week, [gh]).filter((a) => a.type === "greenhouse_cold");
    expect(cold.date).toBe("2026-10-07");
    expect(cold.descriptionParams?.outside).toBe(-6);
    // Twin-wall polycarbonate: +2 °C conservative night buffer.
    expect(cold.descriptionParams?.temp).toBe(-4);
    expect(cold.descriptionParams?.count).toBe(4);
    expect(cold.severity).toBe("danger");
    expect(cold.descriptionKey).toBe("alerts.greenhouseFrostDesc");
  });

  it("uses a smaller buffer for glass and foil", () => {
    const glass = { ...gh, greenhouseConfig: { ...gh.greenhouseConfig!, material: "glass" as const } };
    const [cold] = detectGreenhouseAlerts(week, [glass]).filter((a) => a.type === "greenhouse_cold");
    expect(cold.descriptionParams?.temp).toBe(-5);
  });

  it("skips the cold alert for heated houses", () => {
    const heated = { ...gh, greenhouseConfig: { ...gh.greenhouseConfig!, heated: true } };
    expect(detectGreenhouseAlerts(week, [heated]).some((a) => a.type === "greenhouse_cold")).toBe(false);
  });

  it("can raise heat and cold for the same house", () => {
    const mixed = [makeForecast({ date: "2026-05-01", tempMin: 1, tempMax: 31 }), makeForecast({ date: "2026-05-02", tempMin: 8, tempMax: 33 })];
    const alerts = detectGreenhouseAlerts(mixed, [gh]);
    expect(alerts.map((a) => a.type).sort()).toEqual(["greenhouse_cold", "greenhouse_hot"]);
    expect(alerts.find((a) => a.type === "greenhouse_hot")?.date).toBe("2026-05-02");
  });
});

describe("summarizeFrost", () => {
  const days = [
    { date: "2026-10-04", tempMin: -3 },
    { date: "2026-10-05", tempMin: 2 },
    { date: "2026-10-06", tempMin: -1 },
    { date: "2026-10-07", tempMin: -6 },
    { date: "2026-10-08", tempMin: 5 },
  ];
  it("counts nights from today onwards and names the coldest", () => {
    const s = summarizeFrost(days, 2, "2026-10-05");
    expect(s?.nights.map((n) => n.date)).toEqual(["2026-10-05", "2026-10-06", "2026-10-07"]);
    expect(s?.coldest).toEqual({ date: "2026-10-07", tempMin: -6 });
    expect(s?.severity).toBe("danger");
  });
  it("returns null without frost nights", () => {
    expect(summarizeFrost(days, -10, "2026-10-05")).toBeNull();
  });
});

describe("frost risk per bed (map pins, warning and weather page share it)", () => {
  const plantMap = new Map((plantsData as Plant[]).map((p) => [p.id, p]));
  const cells = (...ids: string[]) => ids.map((plantId, i) => ({ cellX: i, cellY: 0, plantId }));
  const bed = (id: string, environmentType: Bed["environmentType"], plantIds: string[], extra: Partial<Bed> = {}): Bed =>
    ({ id, name: id, x: 0, y: 0, width: 4, height: 4, environmentType, cells: cells(...plantIds), ...extra }) as Bed;
  const glass = (heated: boolean): Partial<Bed> => ({
    greenhouseConfig: { material: "polycarbonate", heated, ventilation: "manual", minTempC: 5, maxTempC: 35, frostProtectionWeeks: 4 },
  });
  const beds = [
    bed("hochbeet", "raised_bed", ["lettuce", "radish", "carrot", "spinach", "chard", "onion", "beetroot"]),
    bed("gh", "greenhouse", ["tomato", "pepper", "cucumber"], glass(false)),
    bed("acker", "outdoor_bed", ["potato", "pumpkin", "bean", "corn"]),
    bed("kuebel", "container", ["rosemary", "thyme", "parsley", "chives"]),
  ];
  const frost = (tempMin: number) => ({ coldest: { date: "2026-10-11", tempMin } });

  it("pins only beds with frost-tender crops — winter-hardy beds and herbs stay calm", () => {
    const risks = frostRiskByBed(beds, plantMap, frost(-1));
    expect(risks.map((r) => r.bedId)).toEqual(["acker"]);
    expect(risks[0].plantIds).toEqual(["pumpkin", "bean", "corn"]);
    expect(frostAffectedPlants(risks)).toEqual(["pumpkin", "bean", "corn"]);
  });

  it("reaches into an unheated greenhouse only when it freezes inside", () => {
    // polycarbonate keeps ≈ 2 °C: −1 outside stays above 0 inside, −6 does not.
    expect(frostRiskByBed(beds, plantMap, frost(-6)).map((r) => r.bedId)).toEqual(["gh", "acker"]);
    const heated = [bed("gh", "greenhouse", ["tomato"], glass(true))];
    expect(frostRiskByBed(heated, plantMap, frost(-10))).toHaveLength(0);
  });

  it("leaves out crops whose harvest (plus the late grace) is over", () => {
    // Beans sown 8 May are long harvested by October; pumpkin keeps cropping until the frost.
    const dated = [bed("acker", "outdoor_bed", ["pumpkin", "bean"], {
      cells: [{ cellX: 0, cellY: 0, plantId: "pumpkin", plantedDate: "2026-05-08" }, { cellX: 1, cellY: 0, plantId: "bean", plantedDate: "2026-05-08" }],
    })];
    const season = { now: new Date(2026, 9, 9), lastFrostDate: "2026-05-15" };
    expect(frostRiskByBed(dated, plantMap, frost(-1), season)[0]?.plantIds).toEqual(["pumpkin"]);
    // Without the season (no dates known), every tender crop counts.
    expect(frostRiskByBed(dated, plantMap, frost(-1))[0]?.plantIds).toEqual(["pumpkin", "bean"]);
  });

  it("no frost, no risk", () => {
    expect(frostRiskByBed(beds, plantMap, null)).toHaveLength(0);
  });

  it("knows tender from hardy crops", () => {
    for (const id of ["tomato", "pumpkin", "bean", "corn", "basil", "cucumber"]) expect(isFrostSensitive(plantMap.get(id)!), id).toBe(true);
    for (const id of ["spinach", "chard", "carrot", "rosemary", "thyme", "chives", "garlic", "kale", "leek", "lambs_lettuce"]) expect(isFrostSensitive(plantMap.get(id)!), id).toBe(false);
  });
});
