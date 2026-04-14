import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSettingsSlice, type SettingsSlice } from "./settingsSlice";
import { createGardenSlice, type GardenSlice } from "./gardenSlice";
import { createTaskSlice, type TaskSlice } from "./taskSlice";
import { createHarvestSlice, type HarvestSlice } from "./harvestSlice";
import { createJournalSlice, type JournalSlice } from "./journalSlice";
import { createWeatherSlice, type WeatherSlice } from "./weatherSlice";
import { createCustomPlantsSlice, type CustomPlantsSlice } from "./customPlantsSlice";
import { createExpenseSlice, type ExpenseSlice } from "./expenseSlice";
import { createSeedSlice, type SeedSlice } from "./seedSlice";
import { createSoilSlice, type SoilSlice } from "./soilSlice";
import { createPestSlice, type PestSlice } from "./pestSlice";
import { createLivestockSlice, type LivestockSlice } from "./livestockSlice";
import type { Garden, SeasonArchive } from "@/types/garden";

export type AppStore = SettingsSlice & GardenSlice & TaskSlice & HarvestSlice & JournalSlice & WeatherSlice & CustomPlantsSlice & ExpenseSlice & SeedSlice & SoilSlice & PestSlice & LivestockSlice & {
  seasonArchives: SeasonArchive[];
  archiveSeason: (gardenId: string) => void;
};

interface PersistedState {
  gardens?: Garden[];
  seasonArchives?: SeasonArchive[];
}

export const useStore = create<AppStore>()(
  persist(
    (...a) => ({
      ...createSettingsSlice(...a),
      ...createGardenSlice(...a),
      ...createTaskSlice(...a),
      ...createHarvestSlice(...a),
      ...createJournalSlice(...a),
      ...createWeatherSlice(...a),
      ...createCustomPlantsSlice(...a),
      ...createExpenseSlice(...a),
      ...createSeedSlice(...a),
      ...createSoilSlice(...a),
      ...createPestSlice(...a),
      ...createLivestockSlice(...a),
      seasonArchives: [],
      archiveSeason: (gardenId: string) => {
        const [set, get] = [a[0], a[1]];
        const garden = get().gardens.find((g) => g.id === gardenId);
        if (!garden) return;
        const archive: SeasonArchive = {
          season: garden.season,
          gardenId: garden.id,
          gardenName: garden.name,
          beds: JSON.parse(JSON.stringify(garden.beds)),
          archivedAt: new Date().toISOString(),
        };
        const nextYear = String(Number(garden.season) + 1);
        set((state) => ({
          seasonArchives: [...state.seasonArchives, archive],
          gardens: state.gardens.map((g) =>
            g.id === gardenId
              ? { ...g, season: nextYear, beds: g.beds.map((b) => ({ ...b, cells: [] })), updatedAt: new Date().toISOString() }
              : g
          ),
        }));
      },
    }),
    {
      name: "gardener-storage",
      version: 3,
      migrate: (persisted, version) => {
        const state = persisted as PersistedState;
        if (version < 2 && state.gardens) {
          state.gardens = state.gardens.map((g) => ({
            ...g,
            beds: g.beds.map((b) => ({
              ...b,
              environmentType: b.environmentType ?? "outdoor_bed",
            })),
          }));
        }
        if (version < 3 && state.gardens) {
          const currentYear = String(new Date().getFullYear());
          state.gardens = state.gardens.map((g) => ({
            ...g,
            season: g.season ?? currentYear,
          }));
          if (!state.seasonArchives) {
            state.seasonArchives = [];
          }
        }
        return state as AppStore;
      },
    }
  )
);
