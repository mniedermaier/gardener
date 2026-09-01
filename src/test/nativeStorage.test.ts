import { describe, it, expect, vi } from "vitest";
import type { StateStorage } from "zustand/middleware";

const files = new Map<string, string>();
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock("@capacitor/filesystem", () => ({
  Directory: { Data: "DATA" },
  Encoding: { UTF8: "utf8" },
  Filesystem: {
    readFile: async ({ path }: { path: string }) => {
      if (!files.has(path)) throw new Error("ENOENT");
      return { data: files.get(path) };
    },
    writeFile: async ({ path, data }: { path: string; data: string }) => void files.set(path, data),
    deleteFile: async ({ path }: { path: string }) => void files.delete(path),
  },
}));

import { withNativeRestore, PERSIST_NAME } from "@/lib/nativeStorage";

function memoryStorage(): StateStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe("withNativeRestore", () => {
  it("returns the storage untouched in the browser", () => {
    const storage = memoryStorage();
    expect(withNativeRestore(storage, false)).toBe(storage);
  });

  it("prefers localStorage when it has data", async () => {
    const storage = memoryStorage();
    storage.data.set(PERSIST_NAME, "local");
    files.set("gardener-store.json", "file");
    expect(await withNativeRestore(storage, true).getItem(PERSIST_NAME)).toBe("local");
  });

  it("restores from the file snapshot when localStorage is empty and writes it back", async () => {
    const storage = memoryStorage();
    files.set("gardener-store.json", '{"state":{"gardens":[]},"version":4}');
    const value = await withNativeRestore(storage, true).getItem(PERSIST_NAME);
    expect(value).toBe('{"state":{"gardens":[]},"version":4}');
    expect(storage.data.get(PERSIST_NAME)).toBe(value);
  });

  it("returns null when neither exists", async () => {
    files.clear();
    const storage = memoryStorage();
    expect(await withNativeRestore(storage, true).getItem(PERSIST_NAME)).toBeNull();
  });
});
