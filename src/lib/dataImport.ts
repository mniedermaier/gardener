import { useStore } from "@/store";
import type { GardenerExport } from "./dataExport";

export type ImportMode = "overwrite" | "merge";

export interface ImportResult {
  success: boolean;
  error?: string;
  stats: {
    gardens: number;
    tasks: number;
    harvests: number;
    journalEntries: number;
    expenses: number;
    customPlants: number;
    seasonArchives: number;
  };
}

export function validateExportFile(json: unknown): json is GardenerExport {
  if (!json || typeof json !== "object") return false;
  const obj = json as Record<string, unknown>;
  if (obj.app !== "gardener") return false;
  if (typeof obj.version !== "number") return false;
  if (!obj.data || typeof obj.data !== "object") return false;
  const data = obj.data as Record<string, unknown>;
  if (!Array.isArray(data.gardens)) return false;
  return true;
}

export function importAllData(
  exported: GardenerExport,
  mode: ImportMode,
): ImportResult {
  const store = useStore.getState();
  const { data } = exported;

  try {
    if (mode === "overwrite") {
      return importOverwrite(data);
    } else {
      return importMerge(data, store);
    }
  } catch (e) {
    return {
      success: false,
      error: String(e),
      stats: { gardens: 0, tasks: 0, harvests: 0, journalEntries: 0, expenses: 0, customPlants: 0, seasonArchives: 0 },
    };
  }
}

function importOverwrite(data: GardenerExport["data"]): ImportResult {
  const set = useStore.setState;

  set({
    gardens: data.gardens ?? [],
    activeGardenId: data.gardens?.[0]?.id ?? null,
    tasks: data.tasks ?? [],
    harvests: data.harvests ?? [],
    journalEntries: data.journalEntries ?? [],
    expenses: data.expenses ?? [],
    customPlants: data.customPlants ?? [],
    seasonArchives: data.seasonArchives ?? [],
    animals: data.animals ?? [],
    animalProducts: data.animalProducts ?? [],
    feedEntries: data.feedEntries ?? [],
    weatherHistory: data.weatherHistory ?? [],
  });

  // Import settings
  if (data.settings) {
    const s = data.settings;
    set({
      locale: (s.locale as "de" | "en") ?? "de",
      lastFrostDate: s.lastFrostDate ?? "2026-05-15",
      gridCellSizeCm: s.gridCellSizeCm ?? 30,
      locationLat: s.locationLat ?? null,
      locationLon: s.locationLon ?? null,
      locationName: s.locationName ?? "",
      theme: (s.theme as "light" | "dark" | "system") ?? "system",
    });
    if (s.alerts) {
      useStore.getState().setAlerts(s.alerts);
    }
  }

  return {
    success: true,
    stats: {
      gardens: data.gardens?.length ?? 0,
      tasks: data.tasks?.length ?? 0,
      harvests: data.harvests?.length ?? 0,
      journalEntries: data.journalEntries?.length ?? 0,
      expenses: data.expenses?.length ?? 0,
      customPlants: data.customPlants?.length ?? 0,
      seasonArchives: data.seasonArchives?.length ?? 0,
    },
  };
}

function importMerge(
  data: GardenerExport["data"],
  current: ReturnType<typeof useStore.getState>,
): ImportResult {
  const set = useStore.setState;

  // Merge arrays by ID (keep existing, add new)
  const mergeById = <T extends { id: string }>(existing: T[], incoming: T[]): T[] => {
    const existingIds = new Set(existing.map((item) => item.id));
    const newItems = incoming.filter((item) => !existingIds.has(item.id));
    return [...existing, ...newItems];
  };

  const mergedGardens = mergeById(current.gardens, data.gardens ?? []);
  const mergedTasks = mergeById(current.tasks, data.tasks ?? []);
  const mergedHarvests = mergeById(current.harvests, data.harvests ?? []);
  const mergedJournal = mergeById(current.journalEntries, data.journalEntries ?? []);
  const mergedExpenses = mergeById(current.expenses, data.expenses ?? []);
  const mergedCustomPlants = mergeById(current.customPlants, data.customPlants ?? []);
  const mergedAnimals = mergeById(current.animals, data.animals ?? []);
  const mergedAnimalProducts = mergeById(current.animalProducts, data.animalProducts ?? []);
  const mergedFeedEntries = mergeById(current.feedEntries, data.feedEntries ?? []);

  // Season archives: merge by gardenId+season combo
  const existingArchiveKeys = new Set(
    current.seasonArchives.map((a) => `${a.gardenId}-${a.season}`)
  );
  const newArchives = (data.seasonArchives ?? []).filter(
    (a) => !existingArchiveKeys.has(`${a.gardenId}-${a.season}`)
  );
  const mergedArchives = [...current.seasonArchives, ...newArchives];

  // Weather: merge by date
  const existingDates = new Set(current.weatherHistory.map((w) => w.date));
  const newWeather = (data.weatherHistory ?? []).filter((w) => !existingDates.has(w.date));
  const mergedWeather = [...current.weatherHistory, ...newWeather]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 365);

  set({
    gardens: mergedGardens,
    tasks: mergedTasks,
    harvests: mergedHarvests,
    journalEntries: mergedJournal,
    expenses: mergedExpenses,
    customPlants: mergedCustomPlants,
    animals: mergedAnimals,
    animalProducts: mergedAnimalProducts,
    feedEntries: mergedFeedEntries,
    seasonArchives: mergedArchives,
    weatherHistory: mergedWeather,
  });

  return {
    success: true,
    stats: {
      gardens: mergedGardens.length - current.gardens.length,
      tasks: mergedTasks.length - current.tasks.length,
      harvests: mergedHarvests.length - current.harvests.length,
      journalEntries: mergedJournal.length - current.journalEntries.length,
      expenses: mergedExpenses.length - current.expenses.length,
      customPlants: mergedCustomPlants.length - current.customPlants.length,
      seasonArchives: mergedArchives.length - current.seasonArchives.length,
    },
  };
}

export function clearAllData(): void {
  localStorage.removeItem("gardener-storage");
  sessionStorage.removeItem("gardener-weather");
  window.location.reload();
}
