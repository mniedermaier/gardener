import type { StateCreator } from "zustand";
import type { SeedItem } from "@/types/seed";

export interface SeedSlice {
  seeds: SeedItem[];
  addSeed: (seed: Omit<SeedItem, "id">) => void;
  updateSeed: (id: string, updates: Partial<SeedItem>) => void;
  deleteSeed: (id: string) => void;
}

let nextId = Date.now();
const genId = () => `seed-${nextId++}`;

export const createSeedSlice: StateCreator<SeedSlice> = (set) => ({
  seeds: [],

  addSeed: (seed) =>
    set((state) => ({
      seeds: [...state.seeds, { ...seed, id: genId() }],
    })),

  updateSeed: (id, updates) =>
    set((state) => ({
      seeds: state.seeds.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),

  deleteSeed: (id) =>
    set((state) => ({
      seeds: state.seeds.filter((s) => s.id !== id),
    })),
});
