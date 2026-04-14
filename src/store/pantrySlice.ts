import type { StateCreator } from "zustand";
import type { PantryItem } from "@/types/pantry";

export interface PantrySlice {
  pantryItems: PantryItem[];
  addPantryItem: (item: Omit<PantryItem, "id">) => void;
  updatePantryItem: (id: string, updates: Partial<PantryItem>) => void;
  deletePantryItem: (id: string) => void;
  consumePantryItem: (id: string) => void;
}

let nextId = Date.now();
const genId = () => `pantry-${nextId++}`;

export const createPantrySlice: StateCreator<PantrySlice> = (set) => ({
  pantryItems: [],

  addPantryItem: (item) =>
    set((state) => ({ pantryItems: [...state.pantryItems, { ...item, id: genId() }] })),

  updatePantryItem: (id, updates) =>
    set((state) => ({ pantryItems: state.pantryItems.map((p) => (p.id === id ? { ...p, ...updates } : p)) })),

  deletePantryItem: (id) =>
    set((state) => ({ pantryItems: state.pantryItems.filter((p) => p.id !== id) })),

  consumePantryItem: (id) =>
    set((state) => ({
      pantryItems: state.pantryItems.map((p) =>
        p.id === id ? { ...p, consumed: true, consumedDate: new Date().toISOString().slice(0, 10) } : p
      ),
    })),
});
