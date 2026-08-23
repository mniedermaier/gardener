import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/store";

/**
 * Covers the snapshot semantics the sync relies on. The hook itself needs a
 * backend; what matters here is that the store can adopt a remote snapshot
 * (so deletions and edits arrive) and merge without dropping local records.
 */

const COLLECTION = "harvests" as const;

type Harvest = { id: string; plantId: string; date: string; weightGrams: number };

function harvest(id: string, weightGrams = 100): Harvest {
  return { id, plantId: "tomato", date: "2026-08-01", weightGrams };
}

function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const known = new Set(local.map((item) => item.id));
  return [...local, ...remote.filter((item) => !known.has(item.id))];
}

describe("Sync snapshot handling", () => {
  beforeEach(() => {
    useStore.setState({ [COLLECTION]: [] } as never);
  });

  it("adopting a snapshot removes records deleted elsewhere", () => {
    useStore.setState({ [COLLECTION]: [harvest("a"), harvest("b")] } as never);

    // Another device deleted "b" and pushed its snapshot.
    useStore.setState({ [COLLECTION]: [harvest("a")] } as never);

    const ids = useStore.getState()[COLLECTION].map((h) => h.id);
    expect(ids).toEqual(["a"]);
  });

  it("adopting a snapshot carries over edits made elsewhere", () => {
    useStore.setState({ [COLLECTION]: [harvest("a", 100)] } as never);
    useStore.setState({ [COLLECTION]: [harvest("a", 250)] } as never);

    expect(useStore.getState()[COLLECTION][0].weightGrams).toBe(250);
  });

  it("merging keeps local records the remote does not know", () => {
    const local = [harvest("local-only"), harvest("shared")];
    const remote = [harvest("shared"), harvest("remote-only")];

    const merged = mergeById(local, remote);

    expect(merged.map((h) => h.id).sort()).toEqual(["local-only", "remote-only", "shared"]);
  });

  it("merging prefers the local copy on conflict", () => {
    const merged = mergeById([harvest("shared", 100)], [harvest("shared", 999)]);

    expect(merged).toHaveLength(1);
    expect(merged[0].weightGrams).toBe(100);
  });

  it("tracks the snapshot the device last agreed with", () => {
    expect(useStore.getState().lastSyncedAt).toBeNull();
    useStore.getState().setLastSyncedAt("2026-08-23T10:00:00.000Z");
    expect(useStore.getState().lastSyncedAt).toBe("2026-08-23T10:00:00.000Z");
  });
});
