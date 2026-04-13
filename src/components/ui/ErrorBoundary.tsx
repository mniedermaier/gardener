import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

function isChunkError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return msg.includes("chunk") || msg.includes("dynamically imported module") || msg.includes("failed to fetch");
}

async function clearCacheAndReload() {
  // Unregister service workers
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      await reg.unregister();
    }
  }
  // Clear all caches
  if ("caches" in window) {
    const names = await caches.keys();
    for (const name of names) {
      await caches.delete(name);
    }
  }
  // Hard reload
  window.location.reload();
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // Auto-recover from chunk load errors (stale cache after deploy)
    if (isChunkError(error)) {
      const alreadyRetried = sessionStorage.getItem("chunk-error-retry");
      if (!alreadyRetried) {
        sessionStorage.setItem("chunk-error-retry", "1");
        clearCacheAndReload();
        return;
      }
      // Already retried once - show error UI
      sessionStorage.removeItem("chunk-error-retry");
    }
  }

  render() {
    if (this.state.hasError) {
      const isChunk = this.state.error && isChunkError(this.state.error);
      return (
        <div className="flex h-screen items-center justify-center p-4">
          <div className="max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-2 text-lg font-bold text-red-600">
              {isChunk ? "Update available" : "Something went wrong"}
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              {isChunk
                ? "A new version is available. Click below to reload."
                : (this.state.error?.message ?? "An unexpected error occurred.")}
            </p>
            <button
              onClick={() => clearCacheAndReload()}
              className="rounded-lg bg-garden-600 px-6 py-2 text-sm font-medium text-white hover:bg-garden-700"
            >
              {isChunk ? "Reload" : "Refresh"}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
