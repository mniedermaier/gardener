import type { StateStorage } from "zustand/middleware";
import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { setWriteMirror } from "./persistStorage";

/**
 * Durable copy of the persisted store for the native (Capacitor) app.
 *
 * Inside the native WebView the store still lives in localStorage — that keeps
 * the persist middleware and every test untouched. But WebView storage is not
 * guaranteed to survive an OS storage clean-up, so every successful write is
 * mirrored (debounced) into an app-private file, and an empty localStorage is
 * refilled from that file the first time the store reads it.
 *
 * Only the native read is asynchronous; in the browser `withNativeRestore`
 * returns the storage unchanged, so hydration stays synchronous there.
 *
 * Journal photos live in IndexedDB and are not covered here.
 */

export const PERSIST_NAME = "gardener-storage";
const FILE = "gardener-store.json";
const DEBOUNCE_MS = 750;

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

async function readSnapshot(): Promise<string | null> {
  try {
    const { data } = await Filesystem.readFile({ path: FILE, directory: Directory.Data, encoding: Encoding.UTF8 });
    return typeof data === "string" && data.length > 0 ? data : null;
  } catch {
    return null; // no snapshot yet
  }
}

async function writeSnapshot(value: string | null): Promise<void> {
  try {
    if (value === null) {
      await Filesystem.deleteFile({ path: FILE, directory: Directory.Data });
    } else {
      await Filesystem.writeFile({ path: FILE, directory: Directory.Data, encoding: Encoding.UTF8, data: value });
    }
  } catch (error) {
    console.warn("[nativeStorage] mirror write failed", error);
  }
}

/** On native, fall back to the file snapshot when localStorage has nothing. */
export function withNativeRestore(storage: StateStorage, native: boolean = isNativeApp()): StateStorage {
  if (!native) return storage;
  return {
    ...storage,
    getItem: async (name) => {
      const local = await storage.getItem(name);
      if (local !== null && local !== undefined) return local;
      const snapshot = await readSnapshot();
      if (snapshot !== null) {
        console.info("[nativeStorage] restored store from file snapshot");
        await storage.setItem(name, snapshot);
      }
      return snapshot;
    },
  };
}

/** Mirror every write of the store key into the snapshot file. */
export function installNativeMirror(): void {
  if (!isNativeApp()) return;

  let pending: string | null | undefined;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    timer = null;
    if (pending === undefined) return;
    const value = pending;
    pending = undefined;
    void writeSnapshot(value);
  };

  setWriteMirror((key, value) => {
    if (key !== PERSIST_NAME) return;
    pending = value;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  });

  // Don't lose the last edit when the app is backgrounded and killed.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && timer) {
      clearTimeout(timer);
      flush();
    }
  });
}
