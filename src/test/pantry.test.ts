import { describe, it, expect, beforeEach } from "vitest";
import { create } from "zustand";
import { createPantrySlice, type PantrySlice } from "@/store/pantrySlice";

function createTestStore() {
  return create<PantrySlice>()((...a) => ({
    ...createPantrySlice(...a),
  }));
}

describe("Pantry slice", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it("should start with empty pantry items", () => {
    expect(store.getState().pantryItems).toHaveLength(0);
  });

  it("should add a pantry item", () => {
    store.getState().addPantryItem({
      plantId: "tomato",
      method: "canning",
      quantityKg: 2.5,
      date: "2026-08-15",
      expiresDate: "2028-08-15",
      consumed: false,
      label: "Tomato Sauce Aug 2026",
    });
    const items = store.getState().pantryItems;
    expect(items).toHaveLength(1);
    expect(items[0].plantId).toBe("tomato");
    expect(items[0].method).toBe("canning");
    expect(items[0].quantityKg).toBe(2.5);
    expect(items[0].label).toBe("Tomato Sauce Aug 2026");
    expect(items[0].id).toBeTruthy();
  });

  it("should delete a pantry item", () => {
    store.getState().addPantryItem({
      plantId: "tomato",
      method: "freezing",
      quantityKg: 1.0,
      date: "2026-08-01",
      expiresDate: "2027-08-01",
      consumed: false,
    });
    const id = store.getState().pantryItems[0].id;
    store.getState().deletePantryItem(id);
    expect(store.getState().pantryItems).toHaveLength(0);
  });

  it("should consume a pantry item with date", () => {
    store.getState().addPantryItem({
      plantId: "carrot",
      method: "root_cellar",
      quantityKg: 3.0,
      date: "2026-10-01",
      expiresDate: "2027-04-01",
      consumed: false,
    });
    const id = store.getState().pantryItems[0].id;
    store.getState().consumePantryItem(id);
    const item = store.getState().pantryItems[0];
    expect(item.consumed).toBe(true);
    expect(item.consumedDate).toBeTruthy();
    // consumedDate should be a valid ISO date string (YYYY-MM-DD)
    expect(item.consumedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("should update a pantry item's fields", () => {
    store.getState().addPantryItem({
      plantId: "pepper",
      method: "drying",
      quantityKg: 0.5,
      date: "2026-09-01",
      expiresDate: "2027-09-01",
      consumed: false,
    });
    const id = store.getState().pantryItems[0].id;
    store.getState().updatePantryItem(id, { quantityKg: 1.0, notes: "Hot peppers" });
    const item = store.getState().pantryItems[0];
    expect(item.quantityKg).toBe(1.0);
    expect(item.notes).toBe("Hot peppers");
    // Other fields unchanged
    expect(item.plantId).toBe("pepper");
    expect(item.method).toBe("drying");
  });

  it("should handle multiple items independently", () => {
    store.getState().addPantryItem({
      plantId: "tomato",
      method: "canning",
      quantityKg: 2.0,
      date: "2026-08-01",
      expiresDate: "2028-08-01",
      consumed: false,
    });
    store.getState().addPantryItem({
      plantId: "bean",
      method: "freezing",
      quantityKg: 1.5,
      date: "2026-09-01",
      expiresDate: "2027-09-01",
      consumed: false,
    });
    expect(store.getState().pantryItems).toHaveLength(2);

    const tomatoId = store.getState().pantryItems[0].id;
    store.getState().deletePantryItem(tomatoId);
    expect(store.getState().pantryItems).toHaveLength(1);
    expect(store.getState().pantryItems[0].plantId).toBe("bean");
  });
});
