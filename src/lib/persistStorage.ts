import type { StateStorage } from "zustand/middleware";

/**
 * localStorage wrapper that reports write failures.
 *
 * Zustand's persist middleware routes storage errors through an internal
 * thenable whose rejection nobody observes, so a QuotaExceededError there is
 * swallowed: the app keeps running on in-memory state and everything written
 * after the overflow is gone on the next reload. This wrapper catches the write
 * itself and hands the failure to listeners so the UI can say so.
 */

export type StorageFailure = { kind: "quota" | "other"; error: unknown };

const listeners = new Set<(failure: StorageFailure) => void>();
let lastFailureKind: StorageFailure["kind"] | null = null;

export function onStorageFailure(listener: (failure: StorageFailure) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22)
  );
}

function report(error: unknown) {
  const kind: StorageFailure["kind"] = isQuotaError(error) ? "quota" : "other";
  // Only announce a change in condition — persist writes on every mutation.
  if (kind === lastFailureKind) return;
  lastFailureKind = kind;
  for (const listener of listeners) listener({ kind, error });
}

export const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch (error) {
      report(error);
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
      lastFailureKind = null;
    } catch (error) {
      report(error);
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch (error) {
      report(error);
    }
  },
};

/** Share of the storage quota already used, or null when unavailable. */
export async function storagePressure(): Promise<number | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage, quota } = await navigator.storage.estimate();
  if (!usage || !quota) return null;
  return usage / quota;
}
