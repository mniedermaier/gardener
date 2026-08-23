import { StrictMode, Suspense } from "react";
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
import "./lib/i18n";
import "./index.css";
import App from "./App";

initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-gray-400">Loading...</div>}>
          <App />
        </Suspense>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>
);
