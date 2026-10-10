import { StrictMode, Suspense, useEffect, useState } from "react";
// Selbst gehostet: funktioniert offline und lädt nichts von fremden Servern.
// Nur latin + latin-ext — die App spricht Deutsch, Englisch, Spanisch,
// Französisch; die übrigen Subsets wären reiner Ballast im Precache.
import "@fontsource/inter/latin-300.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/latin-ext-600.css";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { ToastProvider } from "./components/ui/Toast";
import { initTheme } from "./lib/theme";
import { installNativeMirror } from "./lib/nativeStorage";
import { installNativeHandlers } from "./lib/native";
import { useStore } from "./store";
import "./lib/i18n";
import "./index.css";
import App from "./App";

initTheme();
installNativeMirror();
installNativeHandlers();

const loading = <div className="flex h-screen items-center justify-center text-gray-400">Loading…</div>;

/**
 * In the browser the store hydrates synchronously and this renders App at
 * once. In the native app the first read may come from the file mirror, so
 * App (which decides on onboarding from the hydrated gardens) waits for it.
 */
function HydrationGate() {
  const [hydrated, setHydrated] = useState(() => useStore.persist.hasHydrated());
  useEffect(() => useStore.persist.onFinishHydration(() => setHydrated(true)), []);
  return hydrated ? <App /> : loading;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <Suspense fallback={loading}>
          <HydrationGate />
        </Suspense>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>
);
