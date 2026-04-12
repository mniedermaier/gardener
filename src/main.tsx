import { StrictMode, Suspense } from "react";
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
