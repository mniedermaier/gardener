import { describe, it, expect, beforeEach } from "vitest";
import { create } from "zustand";
import { createLivestockSlice, type LivestockSlice } from "@/store/livestockSlice";

function createTestStore() {
  return create<LivestockSlice>()((...a) => ({
    ...createLivestockSlice(...a),
  }));
}

describe("Livestock slice", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it("should start with empty arrays", () => {
    const state = store.getState();
    expect(state.animals).toHaveLength(0);
    expect(state.animalProducts).toHaveLength(0);
    expect(state.feedEntries).toHaveLength(0);
    expect(state.healthEvents).toHaveLength(0);
  });

  describe("Animal operations", () => {
    it("should add an animal", () => {
      store.getState().addAnimal({
        type: "chicken",
        name: "Henrietta",
        count: 3,
        acquiredDate: "2026-03-01",
      });
      const animals = store.getState().animals;
      expect(animals).toHaveLength(1);
      expect(animals[0].type).toBe("chicken");
      expect(animals[0].name).toBe("Henrietta");
      expect(animals[0].count).toBe(3);
      expect(animals[0].id).toBeTruthy();
    });

    it("should update an animal", () => {
      store.getState().addAnimal({
        type: "chicken",
        count: 3,
        acquiredDate: "2026-03-01",
      });
      const id = store.getState().animals[0].id;
      store.getState().updateAnimal(id, { count: 5, name: "Flock A" });
      const animal = store.getState().animals[0];
      expect(animal.count).toBe(5);
      expect(animal.name).toBe("Flock A");
      expect(animal.type).toBe("chicken");
    });

    it("should delete an animal and cascade delete products, feed, and health events", () => {
      store.getState().addAnimal({
        type: "goat",
        count: 2,
        acquiredDate: "2026-01-01",
      });
      const animalId = store.getState().animals[0].id;

      // Add related records
      store.getState().addProduct({
        animalId,
        type: "milk",
        date: "2026-04-01",
        quantity: 5,
        unit: "liters",
      });
      store.getState().addFeedEntry({
        animalId,
        date: "2026-04-01",
        feedType: "hay",
        quantity: 2,
        unit: "kg",
      });
      store.getState().addHealthEvent({
        animalId,
        date: "2026-04-01",
        type: "checkup",
        description: "Annual checkup",
      });

      expect(store.getState().animalProducts).toHaveLength(1);
      expect(store.getState().feedEntries).toHaveLength(1);
      expect(store.getState().healthEvents).toHaveLength(1);

      // Delete the animal — should cascade
      store.getState().deleteAnimal(animalId);
      expect(store.getState().animals).toHaveLength(0);
      expect(store.getState().animalProducts).toHaveLength(0);
      expect(store.getState().feedEntries).toHaveLength(0);
      expect(store.getState().healthEvents).toHaveLength(0);
    });

    it("should only cascade delete records for the deleted animal", () => {
      store.getState().addAnimal({ type: "chicken", count: 3, acquiredDate: "2026-01-01" });
      store.getState().addAnimal({ type: "bee", count: 2, acquiredDate: "2026-01-01" });
      const chickenId = store.getState().animals[0].id;
      const beeId = store.getState().animals[1].id;

      store.getState().addProduct({ animalId: chickenId, type: "eggs", date: "2026-04-01", quantity: 10, unit: "pieces" });
      store.getState().addProduct({ animalId: beeId, type: "honey", date: "2026-04-01", quantity: 5, unit: "kg" });

      store.getState().deleteAnimal(chickenId);
      expect(store.getState().animals).toHaveLength(1);
      expect(store.getState().animals[0].type).toBe("bee");
      expect(store.getState().animalProducts).toHaveLength(1);
      expect(store.getState().animalProducts[0].type).toBe("honey");
    });
  });

  describe("Product operations", () => {
    it("should add and delete a product", () => {
      store.getState().addProduct({
        animalId: "a1",
        type: "eggs",
        date: "2026-04-14",
        quantity: 6,
        unit: "pieces",
      });
      expect(store.getState().animalProducts).toHaveLength(1);
      expect(store.getState().animalProducts[0].quantity).toBe(6);

      const prodId = store.getState().animalProducts[0].id;
      store.getState().deleteProduct(prodId);
      expect(store.getState().animalProducts).toHaveLength(0);
    });
  });

  describe("Health event operations", () => {
    it("should add and delete a health event", () => {
      store.getState().addHealthEvent({
        animalId: "a1",
        date: "2026-04-10",
        type: "vaccination",
        description: "Annual vaccination",
        cost: 45,
      });
      expect(store.getState().healthEvents).toHaveLength(1);
      expect(store.getState().healthEvents[0].type).toBe("vaccination");
      expect(store.getState().healthEvents[0].cost).toBe(45);

      const eventId = store.getState().healthEvents[0].id;
      store.getState().deleteHealthEvent(eventId);
      expect(store.getState().healthEvents).toHaveLength(0);
    });
  });

  describe("Feed entry operations", () => {
    it("should add and delete a feed entry", () => {
      store.getState().addFeedEntry({
        animalId: "a1",
        date: "2026-04-14",
        feedType: "grain",
        quantity: 500,
        unit: "g",
        cost: 2.5,
      });
      expect(store.getState().feedEntries).toHaveLength(1);
      expect(store.getState().feedEntries[0].feedType).toBe("grain");

      const feedId = store.getState().feedEntries[0].id;
      store.getState().deleteFeedEntry(feedId);
      expect(store.getState().feedEntries).toHaveLength(0);
    });
  });
});
