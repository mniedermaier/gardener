import type { StateCreator } from "zustand";
import type { Garden, Bed, CellPlanting } from "@/types/garden";

export interface GardenSlice {
  gardens: Garden[];
  activeGardenId: string | null;
  addGarden: (name: string) => string;
  deleteGarden: (id: string) => void;
  setActiveGarden: (id: string | null) => void;
  addBed: (gardenId: string, bed: Omit<Bed, "id" | "cells">) => void;
  updateBed: (gardenId: string, bedId: string, updates: Partial<Bed>) => void;
  deleteBed: (gardenId: string, bedId: string) => void;
  setCell: (gardenId: string, bedId: string, cell: CellPlanting) => void;
  removeCell: (gardenId: string, bedId: string, cellX: number, cellY: number) => void;
}

let nextId = Date.now();
const genId = () => String(nextId++);

export const createGardenSlice: StateCreator<GardenSlice> = (set) => ({
  gardens: [],
  activeGardenId: null,

  addGarden: (name) => {
    const id = genId();
    set((state) => ({
      gardens: [
        ...state.gardens,
        { id, name, beds: [], season: String(new Date().getFullYear()), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ],
      activeGardenId: id,
    }));
    return id;
  },

  deleteGarden: (id) =>
    set((state) => ({
      gardens: state.gardens.filter((g) => g.id !== id),
      activeGardenId: state.activeGardenId === id ? null : state.activeGardenId,
    })),

  setActiveGarden: (id) => set({ activeGardenId: id }),

  addBed: (gardenId, bed) =>
    set((state) => ({
      gardens: state.gardens.map((g) =>
        g.id === gardenId
          ? { ...g, beds: [...g.beds, { ...bed, id: genId(), cells: [] }], updatedAt: new Date().toISOString() }
          : g
      ),
    })),

  updateBed: (gardenId, bedId, updates) =>
    set((state) => ({
      gardens: state.gardens.map((g) =>
        g.id === gardenId
          ? { ...g, beds: g.beds.map((b) => (b.id === bedId ? { ...b, ...updates } : b)), updatedAt: new Date().toISOString() }
          : g
      ),
    })),

  deleteBed: (gardenId, bedId) =>
    set((state) => ({
      gardens: state.gardens.map((g) =>
        g.id === gardenId
          ? { ...g, beds: g.beds.filter((b) => b.id !== bedId), updatedAt: new Date().toISOString() }
          : g
      ),
    })),

  setCell: (gardenId, bedId, cell) =>
    set((state) => ({
      gardens: state.gardens.map((g) =>
        g.id === gardenId
          ? {
              ...g,
              beds: g.beds.map((b) =>
                b.id === bedId
                  ? {
                      ...b,
                      cells: [
                        ...b.cells.filter((c) => !(c.cellX === cell.cellX && c.cellY === cell.cellY)),
                        cell,
                      ],
                    }
                  : b
              ),
              updatedAt: new Date().toISOString(),
            }
          : g
      ),
    })),

  removeCell: (gardenId, bedId, cellX, cellY) =>
    set((state) => ({
      gardens: state.gardens.map((g) =>
        g.id === gardenId
          ? {
              ...g,
              beds: g.beds.map((b) =>
                b.id === bedId
                  ? { ...b, cells: b.cells.filter((c) => !(c.cellX === cellX && c.cellY === cellY)) }
                  : b
              ),
              updatedAt: new Date().toISOString(),
            }
          : g
      ),
    })),
});
