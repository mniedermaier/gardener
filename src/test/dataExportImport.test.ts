import { describe, it, expect } from "vitest";
import { buildExportData, type GardenerExport } from "@/lib/dataExport";
import { validateExportFile } from "@/lib/dataImport";

describe("Data export", () => {
  it("should build valid export data", () => {
    const data = buildExportData();
    expect(data.version).toBe(1);
    expect(data.app).toBe("gardener");
    expect(data.exportedAt).toBeTruthy();
    expect(data.data).toBeTruthy();
    expect(Array.isArray(data.data.gardens)).toBe(true);
    expect(Array.isArray(data.data.tasks)).toBe(true);
    expect(Array.isArray(data.data.harvests)).toBe(true);
    expect(Array.isArray(data.data.journalEntries)).toBe(true);
    expect(Array.isArray(data.data.expenses)).toBe(true);
    expect(Array.isArray(data.data.customPlants)).toBe(true);
    expect(Array.isArray(data.data.seasonArchives)).toBe(true);
    expect(Array.isArray(data.data.weatherHistory)).toBe(true);
    expect(data.data.settings).toBeTruthy();
    expect(data.data.settings.locale).toBeTruthy();
  });
});

describe("Data import validation", () => {
  it("should accept valid export file", () => {
    const valid: GardenerExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: "gardener",
      data: {
        gardens: [],
        tasks: [],
        harvests: [],
        journalEntries: [],
        expenses: [],
        customPlants: [],
        seasonArchives: [],
        settings: {
          locale: "de",
          lastFrostDate: "2026-05-15",
          gridCellSizeCm: 30,
          locationLat: null,
          locationLon: null,
          locationName: "",
          theme: "system",
          alerts: { frostAlertEnabled: true, frostThresholdC: 2, wateringReminders: true, greenhouseAlerts: true, weeklyDigest: true },
        },
        weatherHistory: [],
      },
    };
    expect(validateExportFile(valid)).toBe(true);
  });

  it("should reject invalid files", () => {
    expect(validateExportFile(null)).toBe(false);
    expect(validateExportFile({})).toBe(false);
    expect(validateExportFile({ app: "other" })).toBe(false);
    expect(validateExportFile({ app: "gardener", version: 1 })).toBe(false);
    expect(validateExportFile({ app: "gardener", version: 1, data: {} })).toBe(false);
    expect(validateExportFile("string")).toBe(false);
  });
});
