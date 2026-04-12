import type { StateCreator } from "zustand";
import type { Plant } from "@/types/plant";

export interface CustomPlantsSlice {
  customPlants: Plant[];
  addCustomPlant: (plant: Plant) => void;
  updateCustomPlant: (id: string, updates: Partial<Plant>) => void;
  deleteCustomPlant: (id: string) => void;
}

export const createCustomPlantsSlice: StateCreator<CustomPlantsSlice> = (set) => ({
  customPlants: [],

  addCustomPlant: (plant) =>
    set((state) => ({
      customPlants: [...state.customPlants, plant],
    })),

  updateCustomPlant: (id, updates) =>
    set((state) => ({
      customPlants: state.customPlants.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),

  deleteCustomPlant: (id) =>
    set((state) => ({
      customPlants: state.customPlants.filter((p) => p.id !== id),
    })),
});
