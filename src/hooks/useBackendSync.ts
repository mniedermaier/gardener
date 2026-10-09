import { useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "@/store";

/**
 * Sync semantics
 *
 * The backend keeps one snapshot of the whole state, so this is a single-user
 * sync with last-write-wins at snapshot level:
 *
 *  - On connect the device pulls first. If it has no unsynced local changes it
 *    adopts the server snapshot wholesale, which is what makes deletions and
 *    edits from another device arrive at all.
 *  - If both sides changed since the last agreement, nothing is thrown away:
 *    the collections are merged by id (local wins on conflict) and the caller
 *    is told the merge was partial.
 *  - After a successful pull or push both sides agree on `savedAt`, which is
 *    stored as `lastSyncedAt`.
 *
 * Deletions propagate because the server treats each pushed snapshot as
 * authoritative and drops rows the snapshot no longer contains.
 */

const COLLECTION_KEYS = [
  "gardens", "tasks", "harvests", "journalEntries", "expenses", "seeds",
  "soilTests", "amendments", "pests", "waterEntries", "animals",
  "animalProducts", "feedEntries", "healthEvents", "pantryItems",
  "customPlants", "seasonArchives",
] as const;

const SETTINGS_KEYS = [
  "locale", "lastFrostDate", "gridCellSizeCm", "locationLat", "locationLon",
  "locationName", "theme", "alerts",
] as const;

export type SyncOutcome =
  | { kind: "idle" }
  | { kind: "adopted" }
  | { kind: "pushed" }
  | { kind: "merged"; reason: "both-changed" }
  | { kind: "failed" };

function buildPayload() {
  const state = useStore.getState() as unknown as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  for (const key of COLLECTION_KEYS) payload[key] = state[key];
  payload.settings = Object.fromEntries(SETTINGS_KEYS.map((k) => [k, state[k]]));
  return payload;
}

type Identified = { id: string };

function mergeById(local: Identified[], remote: Identified[]): Identified[] {
  const known = new Set(local.map((item) => item.id));
  return [...local, ...remote.filter((item) => !known.has(item.id))];
}

function applySnapshot(data: Record<string, unknown>, mode: "adopt" | "merge") {
  const state = useStore.getState() as unknown as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  for (const key of COLLECTION_KEYS) {
    const remote = data[key];
    if (!Array.isArray(remote)) continue;
    const local = state[key];
    if (!Array.isArray(local)) continue;
    updates[key] =
      mode === "adopt" ? remote : mergeById(local as Identified[], remote as Identified[]);
  }

  const settings = data.settings;
  if (settings && typeof settings === "object") {
    for (const key of SETTINGS_KEYS) {
      const value = (settings as Record<string, unknown>)[key];
      if (value !== undefined && value !== null) updates[key] = value;
    }
  }

  if (Object.keys(updates).length > 0) useStore.setState(updates);
}

export function useBackendSync() {
  const backendUrl = useStore((s) => s.backendUrl);
  // Health per URL, so clearing or changing the URL needs no reset in the effect.
  const [health, setHealth] = useState<{ url: string; ok: boolean } | null>(null);
  const connected = !!backendUrl && health?.url === backendUrl && health.ok;
  const [syncing, setSyncing] = useState(false);
  const [outcome, setOutcome] = useState<SyncOutcome>({ kind: "idle" });
  const lastPushedRef = useRef<string | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulledForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!backendUrl) return;

    let cancelled = false;
    const checkHealth = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
        if (!cancelled) setHealth({ url: backendUrl, ok: res.ok });
      } catch {
        if (!cancelled) setHealth({ url: backendUrl, ok: false });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [backendUrl]);

  const pullFromBackend = useCallback(async (): Promise<SyncOutcome> => {
    if (!backendUrl) return { kind: "idle" };
    setSyncing(true);
    try {
      const res = await fetch(`${backendUrl}/api/sync`);
      if (!res.ok) throw new Error(`sync responded ${res.status}`);
      const data = (await res.json()) as Record<string, unknown>;

      const serverSavedAt = typeof data.savedAt === "string" ? data.savedAt : null;
      const { lastSyncedAt, setLastSyncedAt } = useStore.getState();

      // Nothing on the server yet, or we already agree with what is there.
      if (!serverSavedAt || serverSavedAt === lastSyncedAt) {
        const result: SyncOutcome = { kind: "idle" };
        setOutcome(result);
        return result;
      }

      // The server moved on. Did we, too?
      const localChanged = lastPushedRef.current !== null
        ? JSON.stringify(buildPayload()) !== lastPushedRef.current
        : lastSyncedAt !== null;

      if (localChanged) {
        applySnapshot(data, "merge");
        const result: SyncOutcome = { kind: "merged", reason: "both-changed" };
        setOutcome(result);
        return result;
      }

      applySnapshot(data, "adopt");
      setLastSyncedAt(serverSavedAt);
      lastPushedRef.current = JSON.stringify(buildPayload());
      const result: SyncOutcome = { kind: "adopted" };
      setOutcome(result);
      return result;
    } catch {
      const result: SyncOutcome = { kind: "failed" };
      setOutcome(result);
      return result;
    } finally {
      setSyncing(false);
    }
  }, [backendUrl]);

  // Pull once per connection, before the first push, so a fresh device picks up
  // what is already on the server instead of overwriting it.
  useEffect(() => {
    if (!connected || !backendUrl) return;
    if (pulledForRef.current === backendUrl) return;
    pulledForRef.current = backendUrl;
    void pullFromBackend();
  }, [connected, backendUrl, pullFromBackend]);

  useEffect(() => {
    if (!backendUrl) return;

    const push = async () => {
      if (pulledForRef.current !== backendUrl) return; // never push before the initial pull
      const body = JSON.stringify(buildPayload());
      if (body === lastPushedRef.current) return;

      setSyncing(true);
      try {
        const res = await fetch(`${backendUrl}/api/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (!res.ok) throw new Error(`sync responded ${res.status}`);
        const result = (await res.json()) as { savedAt?: string };
        lastPushedRef.current = body;
        if (result.savedAt) useStore.getState().setLastSyncedAt(result.savedAt);
        setOutcome({ kind: "pushed" });
      } catch {
        setOutcome({ kind: "failed" });
      } finally {
        setSyncing(false);
      }
    };

    const unsubscribe = useStore.subscribe(() => {
      if (!connected) return;
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      pushTimerRef.current = setTimeout(() => void push(), 2000);
    });

    return () => {
      unsubscribe();
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [backendUrl, connected]);

  return { connected, syncing, outcome, pullFromBackend };
}
