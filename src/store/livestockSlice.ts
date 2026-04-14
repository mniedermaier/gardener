import type { StateCreator } from "zustand";
import type { Animal, AnimalProduct } from "@/types/animal";

export interface LivestockSlice {
  animals: Animal[];
  animalProducts: AnimalProduct[];
  addAnimal: (animal: Omit<Animal, "id">) => void;
  updateAnimal: (id: string, updates: Partial<Animal>) => void;
  deleteAnimal: (id: string) => void;
  addProduct: (product: Omit<AnimalProduct, "id">) => void;
  deleteProduct: (id: string) => void;
}

let nextId = Date.now();
const genId = (prefix: string) => `${prefix}-${nextId++}`;

export const createLivestockSlice: StateCreator<LivestockSlice> = (set) => ({
  animals: [],
  animalProducts: [],

  addAnimal: (animal) =>
    set((state) => ({ animals: [...state.animals, { ...animal, id: genId("animal") }] })),

  updateAnimal: (id, updates) =>
    set((state) => ({ animals: state.animals.map((a) => (a.id === id ? { ...a, ...updates } : a)) })),

  deleteAnimal: (id) =>
    set((state) => ({
      animals: state.animals.filter((a) => a.id !== id),
      animalProducts: state.animalProducts.filter((p) => p.animalId !== id),
    })),

  addProduct: (product) =>
    set((state) => ({ animalProducts: [...state.animalProducts, { ...product, id: genId("prod") }] })),

  deleteProduct: (id) =>
    set((state) => ({ animalProducts: state.animalProducts.filter((p) => p.id !== id) })),
});
