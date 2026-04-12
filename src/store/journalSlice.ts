import type { StateCreator } from "zustand";
import type { JournalEntry } from "@/types/journal";

export interface JournalSlice {
  journalEntries: JournalEntry[];
  addJournalEntry: (entry: Omit<JournalEntry, "id">) => void;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;
}

let nextId = Date.now();
const genId = () => `journal-${nextId++}`;

export const createJournalSlice: StateCreator<JournalSlice> = (set) => ({
  journalEntries: [],

  addJournalEntry: (entry) =>
    set((state) => ({
      journalEntries: [...state.journalEntries, { ...entry, id: genId() }],
    })),

  updateJournalEntry: (id, updates) =>
    set((state) => ({
      journalEntries: state.journalEntries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),

  deleteJournalEntry: (id) =>
    set((state) => ({
      journalEntries: state.journalEntries.filter((e) => e.id !== id),
    })),
});
