import { describe, it, expect } from "vitest";
import { buildExportData, type GardenerExport } from "@/lib/dataExport";
import { validateExportFile } from "@/lib/dataImport";

function makeExport(overrides: Partial<GardenerExport["data"]> = {}): GardenerExport {
  return {
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
      animals: [],
      animalProducts: [],
      feedEntries: [],
      seeds: [],
      soilTests: [],
      amendments: [],
      pests: [],
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
      ...overrides,
    },
  };
}

describe("Data export", () => {
  it("should build valid export data", () => {
    const data = buildExportData();
    expect(data.version).toBe(1);
    expect(data.app).toBe("gardener");
    expect(data.exportedAt).toBeTruthy();
    expect(Array.isArray(data.data.gardens)).toBe(true);
    expect(Array.isArray(data.data.tasks)).toBe(true);
    expect(Array.isArray(data.data.harvests)).toBe(true);
    expect(data.data.settings).toBeTruthy();
  });

  it("should include all data sections", () => {
    const data = buildExportData();
    expect(data.data).toHaveProperty("gardens");
    expect(data.data).toHaveProperty("tasks");
    expect(data.data).toHaveProperty("harvests");
    expect(data.data).toHaveProperty("journalEntries");
    expect(data.data).toHaveProperty("expenses");
    expect(data.data).toHaveProperty("customPlants");
    expect(data.data).toHaveProperty("seasonArchives");
    expect(data.data).toHaveProperty("weatherHistory");
    expect(data.data).toHaveProperty("settings");
  });
});

describe("Data import validation", () => {
  it("should accept valid export file", () => {
    expect(validateExportFile(makeExport())).toBe(true);
  });

  it("should accept export with data", () => {
    const withData = makeExport({
      gardens: [{ id: "g1", name: "Test", beds: [], season: "2026", createdAt: "", updatedAt: "" }],
      harvests: [{ id: "h1", gardenId: "g1", bedId: "b1", plantId: "tomato", date: "2026-01-01", quality: 3 }],
    });
    expect(validateExportFile(withData)).toBe(true);
  });

  it("should reject null", () => {
    expect(validateExportFile(null)).toBe(false);
  });

  it("should reject empty object", () => {
    expect(validateExportFile({})).toBe(false);
  });

  it("should reject wrong app name", () => {
    expect(validateExportFile({ app: "other", version: 1, data: { gardens: [] } })).toBe(false);
  });

  it("should reject missing data", () => {
    expect(validateExportFile({ app: "gardener", version: 1 })).toBe(false);
  });

  it("should reject missing gardens array", () => {
    expect(validateExportFile({ app: "gardener", version: 1, data: {} })).toBe(false);
  });

  it("should reject string input", () => {
    expect(validateExportFile("string")).toBe(false);
  });

  it("should reject number input", () => {
    expect(validateExportFile(42)).toBe(false);
  });
});
