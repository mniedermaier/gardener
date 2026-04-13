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
  updateCell: (gardenId: string, bedId: string, cellX: number, cellY: number, updates: Partial<CellPlanting>) => void;
  removeCell: (gardenId: string, bedId: string, cellX: number, cellY: number) => void;
  togglePath: (gardenId: string, bedId: string, cellX: number, cellY: number) => void;
  duplicateGarden: (gardenId: string) => string;
  duplicateBed: (gardenId: string, bedId: string) => void;
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

  updateCell: (gardenId, bedId, cellX, cellY, updates) =>
    set((state) => ({
      gardens: state.gardens.map((g) =>
        g.id === gardenId
          ? {
              ...g,
              beds: g.beds.map((b) =>
                b.id === bedId
                  ? { ...b, cells: b.cells.map((c) => c.cellX === cellX && c.cellY === cellY ? { ...c, ...updates } : c) }
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

  togglePath: (gardenId, bedId, cellX, cellY) =>
    set((state) => ({
      gardens: state.gardens.map((g) =>
        g.id === gardenId
          ? {
              ...g,
              beds: g.beds.map((b) => {
                if (b.id !== bedId) return b;
                const key = `${cellX}-${cellY}`;
                const paths = new Set(b.paths ?? []);
                if (paths.has(key)) {
                  paths.delete(key);
                } else {
                  paths.add(key);
                }
                // Remove any plant on this cell when adding a path
                const cells = paths.has(key)
                  ? b.cells.filter((c) => !(c.cellX === cellX && c.cellY === cellY))
                  : b.cells;
                return { ...b, paths: Array.from(paths), cells };
              }),
              updatedAt: new Date().toISOString(),
            }
          : g
      ),
    })),

  duplicateGarden: (gardenId) => {
    const id = genId();
    set((state) => {
      const source = state.gardens.find((g) => g.id === gardenId);
      if (!source) return state;
      const clone: Garden = {
        ...JSON.parse(JSON.stringify(source)),
        id,
        name: `${source.name} (copy)`,
        beds: source.beds.map((b) => ({ ...JSON.parse(JSON.stringify(b)), id: genId() })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { gardens: [...state.gardens, clone], activeGardenId: id };
    });
    return id;
  },

  duplicateBed: (gardenId, bedId) =>
    set((state) => ({
      gardens: state.gardens.map((g) => {
        if (g.id !== gardenId) return g;
        const source = g.beds.find((b) => b.id === bedId);
        if (!source) return g;
        const clone: Bed = {
          ...JSON.parse(JSON.stringify(source)),
          id: genId(),
          name: `${source.name} (copy)`,
          y: g.beds.length,
        };
        return { ...g, beds: [...g.beds, clone], updatedAt: new Date().toISOString() };
      }),
    })),
});
