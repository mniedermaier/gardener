import { describe, it, expect, beforeEach } from "vitest";
import { create } from "zustand";
import { createHarvestSlice, type HarvestSlice } from "@/store/harvestSlice";
import { createJournalSlice, type JournalSlice } from "@/store/journalSlice";

function createHarvestStore() {
  return create<HarvestSlice>()((...a) => createHarvestSlice(...a));
}

function createJournalStore() {
  return create<JournalSlice>()((...a) => createJournalSlice(...a));
}

describe("Harvest slice", () => {
  let store: ReturnType<typeof createHarvestStore>;

  beforeEach(() => {
    store = createHarvestStore();
  });

  it("should add a harvest entry", () => {
    store.getState().addHarvest({
      gardenId: "g1",
      bedId: "b1",
      plantId: "tomato",
      date: "2026-08-15",
      weightGrams: 500,
      quality: 4,
    });
    expect(store.getState().harvests).toHaveLength(1);
    expect(store.getState().harvests[0].plantId).toBe("tomato");
    expect(store.getState().harvests[0].weightGrams).toBe(500);
  });

  it("should delete a harvest entry", () => {
    store.getState().addHarvest({
      gardenId: "g1",
      bedId: "b1",
      plantId: "carrot",
      date: "2026-09-01",
      count: 20,
      quality: 5,
    });
    const id = store.getState().harvests[0].id;
    store.getState().deleteHarvest(id);
    expect(store.getState().harvests).toHaveLength(0);
  });

  it("should update a harvest entry", () => {
    store.getState().addHarvest({
      gardenId: "g1",
      bedId: "b1",
      plantId: "tomato",
      date: "2026-08-15",
      weightGrams: 500,
      quality: 3,
    });
    const id = store.getState().harvests[0].id;
    store.getState().updateHarvest(id, { quality: 5, notes: "Best harvest ever" });
    expect(store.getState().harvests[0].quality).toBe(5);
    expect(store.getState().harvests[0].notes).toBe("Best harvest ever");
  });
});

describe("Journal slice", () => {
  let store: ReturnType<typeof createJournalStore>;

  beforeEach(() => {
    store = createJournalStore();
  });

  it("should add a journal entry", () => {
    store.getState().addJournalEntry({
      gardenId: "g1",
      date: "2026-05-01",
      title: "First planting day",
      text: "Planted tomatoes and basil in the greenhouse.",
      tags: ["planting", "greenhouse"],
    });
    expect(store.getState().journalEntries).toHaveLength(1);
    expect(store.getState().journalEntries[0].title).toBe("First planting day");
    expect(store.getState().journalEntries[0].tags).toEqual(["planting", "greenhouse"]);
  });

  it("should delete a journal entry", () => {
    store.getState().addJournalEntry({
      gardenId: "g1",
      date: "2026-05-01",
      title: "Test",
      text: "Some notes.",
    });
    const id = store.getState().journalEntries[0].id;
    store.getState().deleteJournalEntry(id);
    expect(store.getState().journalEntries).toHaveLength(0);
  });

  it("should update a journal entry", () => {
    store.getState().addJournalEntry({
      gardenId: "g1",
      date: "2026-05-01",
      title: "Original",
      text: "Original text.",
    });
    const id = store.getState().journalEntries[0].id;
    store.getState().updateJournalEntry(id, { title: "Updated", plantId: "tomato" });
    expect(store.getState().journalEntries[0].title).toBe("Updated");
    expect(store.getState().journalEntries[0].plantId).toBe("tomato");
  });
});
