import type { StateCreator } from "zustand";
import type { SoilTest, Amendment } from "@/types/soil";

export interface SoilSlice {
  soilTests: SoilTest[];
  amendments: Amendment[];
  addSoilTest: (test: Omit<SoilTest, "id">) => void;
  updateSoilTest: (id: string, updates: Partial<SoilTest>) => void;
  deleteSoilTest: (id: string) => void;
  addAmendment: (amendment: Omit<Amendment, "id">) => void;
  updateAmendment: (id: string, updates: Partial<Amendment>) => void;
  deleteAmendment: (id: string) => void;
}

let nextId = Date.now();
const genId = (prefix: string) => `${prefix}-${nextId++}`;

export const createSoilSlice: StateCreator<SoilSlice> = (set) => ({
  soilTests: [],
  amendments: [],

  addSoilTest: (test) =>
    set((state) => ({
      soilTests: [...state.soilTests, { ...test, id: genId("soil") }],
    })),

  updateSoilTest: (id, updates) =>
    set((state) => ({
      soilTests: state.soilTests.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  deleteSoilTest: (id) =>
    set((state) => ({
      soilTests: state.soilTests.filter((t) => t.id !== id),
    })),

  addAmendment: (amendment) =>
    set((state) => ({
      amendments: [...state.amendments, { ...amendment, id: genId("amend") }],
    })),

  updateAmendment: (id, updates) =>
    set((state) => ({
      amendments: state.amendments.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  deleteAmendment: (id) =>
    set((state) => ({
      amendments: state.amendments.filter((a) => a.id !== id),
    })),
});
