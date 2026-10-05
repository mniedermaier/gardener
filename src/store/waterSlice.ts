import type { StateCreator } from "zustand";
import type { WaterEntry } from "@/types/water";

export interface WaterSlice {
  waterEntries: WaterEntry[];
  addWaterEntry: (entry: Omit<WaterEntry, "id">) => void;
  updateWaterEntry: (id: string, updates: Partial<WaterEntry>) => void;
  deleteWaterEntry: (id: string) => void;
}

let nextId = Date.now();
const genId = () => `water-${nextId++}`;

export const createWaterSlice: StateCreator<WaterSlice> = (set) => ({
  waterEntries: [],

  addWaterEntry: (entry) =>
    set((state) => ({ waterEntries: [...state.waterEntries, { ...entry, id: genId() }] })),

  updateWaterEntry: (id, updates) =>
    set((state) => ({ waterEntries: state.waterEntries.map((e) => (e.id === id ? { ...e, ...updates } : e)) })),

  deleteWaterEntry: (id) =>
    set((state) => ({ waterEntries: state.waterEntries.filter((e) => e.id !== id) })),
});
