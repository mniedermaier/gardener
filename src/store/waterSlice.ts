import type { StateCreator } from "zustand";
import type { WaterEntry } from "@/types/water";

export interface WaterSlice {
  waterEntries: WaterEntry[];
  addWaterEntry: (entry: Omit<WaterEntry, "id">) => void;
  deleteWaterEntry: (id: string) => void;
}

let nextId = Date.now();
const genId = () => `water-${nextId++}`;

export const createWaterSlice: StateCreator<WaterSlice> = (set) => ({
  waterEntries: [],

  addWaterEntry: (entry) =>
    set((state) => ({ waterEntries: [...state.waterEntries, { ...entry, id: genId() }] })),

  deleteWaterEntry: (id) =>
    set((state) => ({ waterEntries: state.waterEntries.filter((e) => e.id !== id) })),
});
