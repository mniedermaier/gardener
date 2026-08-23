import type { StateStorage } from "zustand/middleware";

/**
 * Storage wrapper that reports write failures.
 *
 * Zustand's persist middleware routes storage errors through an internal
 * thenable whose rejection nobody observes, so a QuotaExceededError there is
 * swallowed: the app keeps running on in-memory state and everything written
 * after the overflow is gone on the next reload. This wrapper catches the write
 * itself and hands the failure to listeners so the UI can say so.
 */

export type StorageFailure = { kind: "quota" | "other"; error: unknown };

const listeners = new Set<(failure: StorageFailure) => void>();

export function onStorageFailure(listener: (failure: StorageFailure) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Duck-typed on purpose: instanceof DOMException is unreliable across realms
// (jsdom vs. node, iframes), and browsers disagree on the name.
function isQuotaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { name, code } = error as { name?: unknown; code?: unknown };
  return (
    name === "QuotaExceededError" ||
    name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    name === "QUOTA_EXCEEDED_ERR" ||
    code === 22 ||
    code === 1014
  );
}

/** Minimal surface of what this wrapper needs — makes the backing store injectable. */
export interface BackingStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createSafeStorage(backing: BackingStore): StateStorage {
  // Only announce a change in condition — persist writes on every mutation.
  let lastFailureKind: StorageFailure["kind"] | null = null;

  const report = (error: unknown) => {
    const kind: StorageFailure["kind"] = isQuotaError(error) ? "quota" : "other";
    if (kind === lastFailureKind) return;
    lastFailureKind = kind;
    for (const listener of listeners) listener({ kind, error });
  };

  return {
    getItem: (name) => {
      try {
        return backing.getItem(name);
      } catch (error) {
        report(error);
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        backing.setItem(name, value);
        lastFailureKind = null;
      } catch (error) {
        report(error);
      }
    },
    removeItem: (name) => {
      try {
        backing.removeItem(name);
      } catch (error) {
        report(error);
      }
    },
  };
}

const memoryFallback = new Map<string, string>();

/** localStorage itself throws in some privacy modes, so even reaching it is guarded. */
function resolveBackingStore(): BackingStore {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // fall through
  }
  return {
    getItem: (key) => memoryFallback.get(key) ?? null,
    setItem: (key, value) => void memoryFallback.set(key, value),
    removeItem: (key) => void memoryFallback.delete(key),
  };
}

export const safeLocalStorage: StateStorage = createSafeStorage(resolveBackingStore());

/** Share of the storage quota already used, or null when unavailable. */
export async function storagePressure(): Promise<number | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage, quota } = await navigator.storage.estimate();
  if (!usage || !quota) return null;
  return usage / quota;
}
