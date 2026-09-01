import { describe, it, expect } from "vitest";
import {
  createSafeStorage,
  onStorageFailure,
  type BackingStore,
} from "@/lib/persistStorage";

function quotaError() {
  return Object.assign(new Error("exceeded"), { name: "QuotaExceededError", code: 22 });
}

/** Backing store whose next write can be made to fail. */
function fakeStore() {
  const data = new Map<string, string>();
  let failNext: (() => Error) | null = null;

  const store: BackingStore & { failOnce(makeError: () => Error): void; failAlways(makeError: () => Error): void } = {
    getItem: (key) => {
      if (failNext) {
        const error = failNext();
        throw error;
      }
      return data.get(key) ?? null;
    },
    setItem: (key, value) => {
      if (failNext) {
        const error = failNext();
        if (once) failNext = null;
        throw error;
      }
      data.set(key, value);
    },
    removeItem: (key) => void data.delete(key),
    failOnce: (makeError) => {
      once = true;
      failNext = makeError;
    },
    failAlways: (makeError) => {
      once = false;
      failNext = makeError;
    },
  };
  let once = false;
  return store;
}

function collectFailures() {
  const seen: string[] = [];
  const stop = onStorageFailure(({ kind }) => seen.push(kind));
  return { seen, stop };
}

describe("safeLocalStorage", () => {
  it("writes through when there is room", () => {
    const backing = fakeStore();
    const storage = createSafeStorage(backing);

    storage.setItem("k", "v");

    expect(backing.getItem("k")).toBe("v");
  });

  it("reports a quota failure instead of swallowing it", () => {
    const backing = fakeStore();
    const storage = createSafeStorage(backing);
    const { seen, stop } = collectFailures();

    backing.failAlways(quotaError);
    // Must not throw — the app keeps running, the user gets told.
    expect(() => storage.setItem("k", "v")).not.toThrow();
    expect(seen).toEqual(["quota"]);

    stop();
  });

  it("announces a failure once, not on every write", () => {
    const backing = fakeStore();
    const storage = createSafeStorage(backing);
    const { seen, stop } = collectFailures();

    backing.failAlways(quotaError);
    storage.setItem("k", "1");
    storage.setItem("k", "2");
    storage.setItem("k", "3");

    expect(seen).toEqual(["quota"]);
    stop();
  });

  it("announces again after recovering", () => {
    const backing = fakeStore();
    const storage = createSafeStorage(backing);
    const { seen, stop } = collectFailures();

    backing.failOnce(quotaError);
    storage.setItem("k", "1");
    storage.setItem("k", "2"); // succeeds, clears the condition
    backing.failOnce(quotaError);
    storage.setItem("k", "3");

    expect(seen).toEqual(["quota", "quota"]);
    stop();
  });

  it("distinguishes a non-quota failure", () => {
    const backing = fakeStore();
    const storage = createSafeStorage(backing);
    const { seen, stop } = collectFailures();

    backing.failAlways(() => Object.assign(new Error("blocked"), { name: "SecurityError" }));
    storage.setItem("k", "v");

    expect(seen).toEqual(["other"]);
    stop();
  });

  it("survives a getItem that throws", () => {
    const backing = fakeStore();
    const storage = createSafeStorage(backing);

    backing.failAlways(() => Object.assign(new Error("blocked"), { name: "SecurityError" }));

    expect(storage.getItem("k")).toBeNull();
  });

  it("keeps each storage instance's condition separate", () => {
    const failing = fakeStore();
    const working = fakeStore();
    const a = createSafeStorage(failing);
    const b = createSafeStorage(working);
    const { seen, stop } = collectFailures();

    failing.failAlways(quotaError);
    a.setItem("k", "1");
    b.setItem("k", "1"); // must not clear a's condition
    a.setItem("k", "2");

    expect(seen).toEqual(["quota"]);
    stop();
  });
});

describe("write mirror", () => {
  it("forwards successful writes and removals, but not failed writes", async () => {
    const { setWriteMirror } = await import("@/lib/persistStorage");
    const store = fakeStore();
    const storage = createSafeStorage(store);
    const seen: Array<[string, string | null]> = [];
    setWriteMirror((key, value) => seen.push([key, value]));

    storage.setItem("k", "v1");
    store.failOnce(quotaError);
    storage.setItem("k", "v2");
    storage.removeItem("k");
    setWriteMirror(null);
    storage.setItem("k", "v3");

    expect(seen).toEqual([["k", "v1"], ["k", null]]);
  });
});
