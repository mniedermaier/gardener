import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store";

export function useBackendSync() {
  const { backendUrl, gardens, tasks } = useStore();
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const lastSyncRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (!connected || !backendUrl) return;

    const dataHash = JSON.stringify({ gardens, tasks });
    if (dataHash === lastSyncRef.current) return;

    const syncToBackend = async () => {
      setSyncing(true);
      try {
        await fetch(`${backendUrl}/api/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gardens, tasks }),
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
  }, [connected, backendUrl, gardens, tasks]);

  const pullFromBackend = async () => {
    if (!connected || !backendUrl) return;
    setSyncing(true);
    try {
      const res = await fetch(`${backendUrl}/api/sync`);
      if (res.ok) {
        const data = await res.json();
        const store = useStore.getState();
        if (data.gardens?.length) {
          for (const g of data.gardens) {
            if (!store.gardens.find((sg) => sg.id === g.id)) {
              store.addGarden(g.name);
            }
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
