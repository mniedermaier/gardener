import { useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "@/store";

export function useBackendSync() {
  const backendUrl = useStore((s) => s.backendUrl);
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const lastSyncRef = useRef<string | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Push full state to backend — subscribe to store changes outside React render
  useEffect(() => {
    if (!backendUrl) return;

    const unsubscribe = useStore.subscribe(() => {
      if (!connected) return;

      // Debounce: clear previous timer
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);

      pushTimerRef.current = setTimeout(async () => {
        const state = useStore.getState();
        const payload = {
          gardens: state.gardens,
          tasks: state.tasks,
          harvests: state.harvests,
          journalEntries: state.journalEntries,
          expenses: state.expenses,
          seeds: state.seeds,
          soilTests: state.soilTests,
          amendments: state.amendments,
          pests: state.pests,
          waterEntries: state.waterEntries,
          animals: state.animals,
          animalProducts: state.animalProducts,
          feedEntries: state.feedEntries,
          healthEvents: state.healthEvents,
          pantryItems: state.pantryItems,
          customPlants: state.customPlants,
          seasonArchives: state.seasonArchives,
          settings: {
            locale: state.locale,
            lastFrostDate: state.lastFrostDate,
            gridCellSizeCm: state.gridCellSizeCm,
            locationLat: state.locationLat,
            locationLon: state.locationLon,
            locationName: state.locationName,
            theme: state.theme,
            alerts: state.alerts,
          },
        };

        const hash = JSON.stringify(payload);
        if (hash === lastSyncRef.current) return;

        try {
          setSyncing(true);
          await fetch(`${backendUrl}/api/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: hash,
          });
          lastSyncRef.current = hash;
        } catch {
          // Silent fail
        } finally {
          setSyncing(false);
        }
      }, 2000);
    });

    return () => {
      unsubscribe();
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [backendUrl, connected]);

  // Pull from backend
  const pullFromBackend = useCallback(async () => {
    if (!connected || !backendUrl) return;
    setSyncing(true);
    try {
      const res = await fetch(`${backendUrl}/api/sync`);
      if (res.ok) {
        const data = await res.json();
        const store = useStore.getState();
        const updates: Record<string, unknown> = {};

        // Merge arrays by ID
        const arrayKeys = [
          "gardens", "tasks", "harvests", "journalEntries", "expenses", "seeds",
          "soilTests", "amendments", "pests", "waterEntries", "animals",
          "animalProducts", "feedEntries", "healthEvents", "pantryItems",
          "customPlants", "seasonArchives",
        ] as const;

        for (const key of arrayKeys) {
          const remoteArr = data[key];
          if (!Array.isArray(remoteArr) || remoteArr.length === 0) continue;
          const localArr = (store as unknown as Record<string, Array<{ id: string }>>)[key];
          if (!Array.isArray(localArr)) continue;
          const localIds = new Set(localArr.map((item) => item.id));
          const newItems = remoteArr.filter((item: { id: string }) => !localIds.has(item.id));
          if (newItems.length > 0) {
            updates[key] = [...localArr, ...newItems];
          }
        }

        // Merge settings
        if (data.settings && typeof data.settings === "object") {
          const settingsKeys = ["locale", "lastFrostDate", "gridCellSizeCm", "locationLat", "locationLon", "locationName", "theme", "alerts"] as const;
          for (const key of settingsKeys) {
            const val = (data.settings as Record<string, unknown>)[key];
            if (val !== undefined && val !== null) {
              updates[key] = val;
            }
          }
        }

        if (Object.keys(updates).length > 0) {
          useStore.setState(updates);
        }
      }
    } catch {
      // Silent fail
    } finally {
      setSyncing(false);
    }
  }, [connected, backendUrl]);

  return { connected, syncing, pullFromBackend };
}
