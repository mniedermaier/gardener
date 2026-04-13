import type { StateCreator } from "zustand";
import type { PestEntry } from "@/types/pest";

export interface PestSlice {
  pests: PestEntry[];
  addPest: (pest: Omit<PestEntry, "id">) => void;
  updatePest: (id: string, updates: Partial<PestEntry>) => void;
  deletePest: (id: string) => void;
}

let nextId = Date.now();
const genId = () => `pest-${nextId++}`;

export const createPestSlice: StateCreator<PestSlice> = (set) => ({
  pests: [],

  addPest: (pest) =>
    set((state) => ({ pests: [...state.pests, { ...pest, id: genId() }] })),

  updatePest: (id, updates) =>
    set((state) => ({ pests: state.pests.map((p) => (p.id === id ? { ...p, ...updates } : p)) })),

  deletePest: (id) =>
    set((state) => ({ pests: state.pests.filter((p) => p.id !== id) })),
});
