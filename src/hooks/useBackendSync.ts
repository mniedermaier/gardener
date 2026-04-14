import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";

/** All syncable array data keys from the store */
const SYNC_KEYS = [
  "gardens",
  "tasks",
  "harvests",
  "journalEntries",
  "expenses",
  "seeds",
  "soilTests",
  "amendments",
  "pests",
  "waterEntries",
  "animals",
  "animalProducts",
  "feedEntries",
  "healthEvents",
  "pantryItems",
  "customPlants",
  "seasonArchives",
] as const;

const SETTINGS_KEYS = [
  "locale",
  "lastFrostDate",
  "gridCellSizeCm",
  "locationLat",
  "locationLon",
  "locationName",
  "theme",
  "alerts",
] as const;

type SyncKey = (typeof SYNC_KEYS)[number];

type StoreState = ReturnType<typeof useStore.getState>;

function selectSyncData(s: StoreState) {
  const data: Record<string, unknown> = {};
  for (const key of SYNC_KEYS) {
    data[key] = s[key as keyof StoreState];
  }
  const settings: Record<string, unknown> = {};
  for (const key of SETTINGS_KEYS) {
    settings[key] = s[key as keyof StoreState];
  }
  data.settings = settings;
  data.backendUrl = s.backendUrl;
  return data;
}

export function useBackendSync() {
  const syncData = useStore(useShallow(selectSyncData));
  const backendUrl = syncData.backendUrl as string | null;
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const lastSyncRef = useRef<string | null>(null);

  // Health check
  useEffect(() => {
    if (!backendUrl) {
      setConnected(false);
      return;
    }

    const checkHealth = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
        setConnected(res.ok);
      } catch {
        setConnected(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  // Push full state to backend on data change
  useEffect(() => {
    if (!connected || !backendUrl) return;

    // Build payload (exclude backendUrl from what we send)
    const { backendUrl: _url, ...payload } = syncData;
    const dataHash = JSON.stringify(payload);
    if (dataHash === lastSyncRef.current) return;

    const syncToBackend = async () => {
      setSyncing(true);
      try {
        await fetch(`${backendUrl}/api/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: dataHash,
        });
        lastSyncRef.current = dataHash;
      } catch {
        // Silent fail - local data is primary
      } finally {
        setSyncing(false);
      }
    };

    const timeout = setTimeout(syncToBackend, 2000);
    return () => clearTimeout(timeout);
  }, [connected, backendUrl, syncData]);

  // Pull from backend and merge into local store
  const pullFromBackend = async () => {
    if (!connected || !backendUrl) return;
    setSyncing(true);
    try {
      const res = await fetch(`${backendUrl}/api/sync`);
      if (res.ok) {
        const data = await res.json();
        const store = useStore.getState();

        // Merge array data: add remote items that don't exist locally (by id)
        for (const key of SYNC_KEYS) {
          const remoteArr = data[key];
          if (!Array.isArray(remoteArr) || remoteArr.length === 0) continue;
          const localArr = (store as unknown as Record<SyncKey, Array<{ id: string }>>)[key];
          if (!Array.isArray(localArr)) continue;
          const localIds = new Set(localArr.map((item) => item.id));
          const newItems = remoteArr.filter((item: { id: string }) => !localIds.has(item.id));
          if (newItems.length > 0) {
            useStore.setState({
              [key]: [...localArr, ...newItems],
            });
          }
        }

        // Merge settings from remote
        if (data.settings && typeof data.settings === "object") {
          const updates: Record<string, unknown> = {};
          for (const key of SETTINGS_KEYS) {
            const remoteVal = (data.settings as Record<string, unknown>)[key];
            if (remoteVal !== undefined && remoteVal !== null) {
              updates[key] = remoteVal;
            }
          }
          if (Object.keys(updates).length > 0) {
            useStore.setState(updates);
          }
        }
      }
    } catch {
      // Silent fail
    } finally {
      setSyncing(false);
    }
  };

  return { connected, syncing, pullFromBackend };
}
