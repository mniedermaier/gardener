import { useStore } from "@/store";
import type { Garden, SeasonArchive } from "@/types/garden";
import type { Task } from "@/types/task";
import type { HarvestEntry } from "@/types/harvest";
import type { JournalEntry } from "@/types/journal";
import type { Expense } from "@/types/expense";
import type { Plant } from "@/types/plant";
import type { AlertConfig } from "@/store/settingsSlice";
import type { WeatherHistoryEntry } from "@/store/weatherSlice";
import type { Animal, AnimalProduct, FeedEntry, HealthEvent } from "@/types/animal";
import type { SeedItem } from "@/types/seed";
import type { SoilTest, Amendment } from "@/types/soil";
import type { PestEntry } from "@/types/pest";
import type { PantryItem } from "@/types/pantry";

export interface GardenerExport {
  version: 1;
  exportedAt: string;
  app: "gardener";
  data: {
    gardens: Garden[];
    tasks: Task[];
    harvests: HarvestEntry[];
    journalEntries: JournalEntry[];
    expenses: Expense[];
    customPlants: Plant[];
    seasonArchives: SeasonArchive[];
    animals: Animal[];
    animalProducts: AnimalProduct[];
    feedEntries: FeedEntry[];
    healthEvents: HealthEvent[];
    seeds: SeedItem[];
    soilTests: SoilTest[];
    amendments: Amendment[];
    pests: PestEntry[];
    pantryItems: PantryItem[];
    settings: {
      locale: string;
      lastFrostDate: string;
      gridCellSizeCm: number;
      locationLat: number | null;
      locationLon: number | null;
      locationName: string;
      theme: string;
      alerts: AlertConfig;
    };
    weatherHistory: WeatherHistoryEntry[];
  };
}

export function buildExportData(): GardenerExport {
  const state = useStore.getState();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: "gardener",
    data: {
      gardens: state.gardens,
      tasks: state.tasks,
      harvests: state.harvests,
      journalEntries: state.journalEntries,
      expenses: state.expenses,
      customPlants: state.customPlants,
      seasonArchives: state.seasonArchives,
      animals: state.animals,
      animalProducts: state.animalProducts,
      feedEntries: state.feedEntries,
      healthEvents: state.healthEvents,
      seeds: state.seeds,
      soilTests: state.soilTests,
      amendments: state.amendments,
      pests: state.pests,
      pantryItems: state.pantryItems,
      settings: {
        locale: state.locale,
        lastFrostDate: state.lastFrostDate,
        gridCellSizeCm: state.gridCellSizeCm,
        locationLat: state.locationLat,
        locationLon: state.locationLon,
        locationName: state.locationName,
        theme: state.theme,
        alerts: state.alerts,
      },
      weatherHistory: state.weatherHistory,
    },
  };
}

export function downloadJson(data: GardenerExport): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gardener-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAllData(): void {
  const data = buildExportData();
  downloadJson(data);
  // Update last backup date
  useStore.getState().setLastBackupDate(new Date().toISOString());
}

// --- CSV Exports ---

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadCsv(content: string, filename: string): void {
  const bom = "\uFEFF"; // UTF-8 BOM for Excel
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportHarvestsCsv(): void {
  const { harvests, gardens } = useStore.getState();
  const header = "Datum,Pflanze,Garten,Beet,Gewicht (g),Stück,Qualität,Notizen";
  const rows = harvests.map((h) => {
    const garden = gardens.find((g) => g.id === h.gardenId);
    const bed = garden?.beds.find((b) => b.id === h.bedId);
    return [
      h.date,
      escapeCsv(h.plantId),
      escapeCsv(garden?.name ?? ""),
      escapeCsv(bed?.name ?? ""),
      h.weightGrams ?? "",
      h.count ?? "",
      h.quality,
      escapeCsv(h.notes ?? ""),
    ].join(",");
  });
  downloadCsv([header, ...rows].join("\n"), `gardener-harvests-${new Date().getFullYear()}.csv`);
}

export function exportExpensesCsv(): void {
  const { expenses } = useStore.getState();
  const header = "Datum,Kategorie,Beschreibung,Betrag (EUR)";
  const rows = expenses.map((e) => [
    e.date,
    escapeCsv(e.category),
    escapeCsv(e.description),
    (e.amountCents / 100).toFixed(2),
  ].join(","));
  downloadCsv([header, ...rows].join("\n"), `gardener-expenses-${new Date().getFullYear()}.csv`);
}
