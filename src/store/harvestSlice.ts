import type { StateCreator } from "zustand";
import type { HarvestEntry } from "@/types/harvest";

export interface HarvestSlice {
  harvests: HarvestEntry[];
  addHarvest: (entry: Omit<HarvestEntry, "id">) => void;
  updateHarvest: (id: string, updates: Partial<HarvestEntry>) => void;
  deleteHarvest: (id: string) => void;
}

let nextId = Date.now();
const genId = () => `harvest-${nextId++}`;

export const createHarvestSlice: StateCreator<HarvestSlice> = (set) => ({
  harvests: [],

  addHarvest: (entry) =>
    set((state) => ({
      harvests: [...state.harvests, { ...entry, id: genId() }],
    })),

  updateHarvest: (id, updates) =>
    set((state) => ({
      harvests: state.harvests.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    })),

  deleteHarvest: (id) =>
    set((state) => ({
      harvests: state.harvests.filter((h) => h.id !== id),
    })),
});
