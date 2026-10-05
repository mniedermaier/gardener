import { describe, it, expect, beforeEach } from "vitest";
import { buildExportData, type GardenerExport } from "@/lib/dataExport";
import { importAllData, validateExportFile } from "@/lib/dataImport";
import { useAnalysisPrefs } from "@/store/analysisPrefs";

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
      healthEvents: [],
      seeds: [],
      soilTests: [],
      amendments: [],
      pests: [],
      waterEntries: [],
      pantryItems: [],
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
      analysisPrefs: { householdSize: 2, productPrices: {} },
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
    expect(data.data).toHaveProperty("analysisPrefs");
  });
});

describe("Analysis preferences in backups", () => {
  beforeEach(() => useAnalysisPrefs.setState({ householdSize: 2, productPrices: {} }));

  it("exports household size and price overrides", () => {
    useAnalysisPrefs.setState({ householdSize: 4, productPrices: { eggs: 0.5 } });
    expect(buildExportData().data.analysisPrefs).toEqual({ householdSize: 4, productPrices: { eggs: 0.5 } });
  });

  it("overwrite import replaces them", () => {
    const result = importAllData(makeExport({ analysisPrefs: { householdSize: 5, productPrices: { honey: 9 } } }), "overwrite");
    expect(result.stats.analysisPrefs).toBe(1);
    expect(useAnalysisPrefs.getState().householdSize).toBe(5);
    expect(useAnalysisPrefs.getState().productPrices).toEqual({ honey: 9 });
  });

  it("merge import keeps current values and adds missing prices", () => {
    useAnalysisPrefs.setState({ householdSize: 3, productPrices: { eggs: 0.4 } });
    importAllData(makeExport({ analysisPrefs: { householdSize: 6, productPrices: { eggs: 1, honey: 9 } } }), "merge");
    expect(useAnalysisPrefs.getState().householdSize).toBe(3);
    expect(useAnalysisPrefs.getState().productPrices).toEqual({ eggs: 0.4, honey: 9 });
  });

  it("old backups without the field still import and leave prefs untouched", () => {
    useAnalysisPrefs.setState({ householdSize: 3, productPrices: { eggs: 0.4 } });
    const old = makeExport();
    delete old.data.analysisPrefs;
    const result = importAllData(old, "overwrite");
    expect(result.success).toBe(true);
    expect(result.stats.analysisPrefs).toBe(0);
    expect(useAnalysisPrefs.getState().householdSize).toBe(3);
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
