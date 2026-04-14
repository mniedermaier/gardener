import { describe, it, expect, beforeEach } from "vitest";
import { create } from "zustand";
import { createWaterSlice, type WaterSlice } from "@/store/waterSlice";

function createTestStore() {
  return create<WaterSlice>()((...a) => ({
    ...createWaterSlice(...a),
  }));
}

describe("Water slice", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it("should start with empty water entries", () => {
    expect(store.getState().waterEntries).toHaveLength(0);
  });

  it("should add a water entry", () => {
    store.getState().addWaterEntry({
      bedId: "b1",
      gardenId: "g1",
      date: "2026-04-14",
      liters: 10,
      method: "hose",
      duration: 15,
    });
    const entries = store.getState().waterEntries;
    expect(entries).toHaveLength(1);
    expect(entries[0].liters).toBe(10);
    expect(entries[0].method).toBe("hose");
    expect(entries[0].duration).toBe(15);
    expect(entries[0].bedId).toBe("b1");
    expect(entries[0].gardenId).toBe("g1");
    expect(entries[0].id).toBeTruthy();
  });

  it("should delete a water entry", () => {
    store.getState().addWaterEntry({
      bedId: "b1",
      gardenId: "g1",
      date: "2026-04-14",
      liters: 5,
      method: "manual",
    });
    const id = store.getState().waterEntries[0].id;
    store.getState().deleteWaterEntry(id);
    expect(store.getState().waterEntries).toHaveLength(0);
  });

  it("should handle multiple entries independently", () => {
    store.getState().addWaterEntry({
      bedId: "b1",
      gardenId: "g1",
      date: "2026-04-14",
      liters: 10,
      method: "drip",
    });
    store.getState().addWaterEntry({
      bedId: "b2",
      gardenId: "g1",
      date: "2026-04-14",
      liters: 20,
      method: "sprinkler",
    });
    expect(store.getState().waterEntries).toHaveLength(2);

    const firstId = store.getState().waterEntries[0].id;
    store.getState().deleteWaterEntry(firstId);
    expect(store.getState().waterEntries).toHaveLength(1);
    expect(store.getState().waterEntries[0].liters).toBe(20);
  });

  it("should support rain method with notes", () => {
    store.getState().addWaterEntry({
      bedId: "b1",
      gardenId: "g1",
      date: "2026-04-13",
      liters: 30,
      method: "rain",
      notes: "Heavy afternoon rain",
    });
    const entry = store.getState().waterEntries[0];
    expect(entry.method).toBe("rain");
    expect(entry.notes).toBe("Heavy afternoon rain");
  });
});
