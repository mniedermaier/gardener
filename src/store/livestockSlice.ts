import type { StateCreator } from "zustand";
import type { Animal, AnimalProduct, FeedEntry, HealthEvent } from "@/types/animal";

export interface LivestockSlice {
  animals: Animal[];
  animalProducts: AnimalProduct[];
  feedEntries: FeedEntry[];
  healthEvents: HealthEvent[];
  addAnimal: (animal: Omit<Animal, "id">) => void;
  updateAnimal: (id: string, updates: Partial<Animal>) => void;
  deleteAnimal: (id: string) => void;
  addProduct: (product: Omit<AnimalProduct, "id">) => void;
  deleteProduct: (id: string) => void;
  addFeedEntry: (entry: Omit<FeedEntry, "id">) => void;
  deleteFeedEntry: (id: string) => void;
  addHealthEvent: (event: Omit<HealthEvent, "id">) => void;
  deleteHealthEvent: (id: string) => void;
}

let nextId = Date.now();
const genId = (prefix: string) => `${prefix}-${nextId++}`;

export const createLivestockSlice: StateCreator<LivestockSlice> = (set) => ({
  animals: [],
  animalProducts: [],
  feedEntries: [],
  healthEvents: [],

  addAnimal: (animal) =>
    set((state) => ({ animals: [...state.animals, { ...animal, id: genId("animal") }] })),

  updateAnimal: (id, updates) =>
    set((state) => ({ animals: state.animals.map((a) => (a.id === id ? { ...a, ...updates } : a)) })),

  deleteAnimal: (id) =>
    set((state) => ({
      animals: state.animals.filter((a) => a.id !== id),
      animalProducts: state.animalProducts.filter((p) => p.animalId !== id),
      feedEntries: state.feedEntries.filter((f) => f.animalId !== id),
      healthEvents: state.healthEvents.filter((h) => h.animalId !== id),
    })),

  addProduct: (product) =>
    set((state) => ({ animalProducts: [...state.animalProducts, { ...product, id: genId("prod") }] })),

  deleteProduct: (id) =>
    set((state) => ({ animalProducts: state.animalProducts.filter((p) => p.id !== id) })),

  addFeedEntry: (entry) =>
    set((state) => ({ feedEntries: [...state.feedEntries, { ...entry, id: genId("feed") }] })),

  deleteFeedEntry: (id) =>
    set((state) => ({ feedEntries: state.feedEntries.filter((f) => f.id !== id) })),

  addHealthEvent: (event) =>
    set((state) => ({ healthEvents: [...state.healthEvents, { ...event, id: genId("health") }] })),

  deleteHealthEvent: (id) =>
    set((state) => ({ healthEvents: state.healthEvents.filter((h) => h.id !== id) })),
});
