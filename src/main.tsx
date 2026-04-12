import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { initTheme } from "./lib/theme";
import "./lib/i18n";
import "./index.css";
import App from "./App";

initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-gray-400">Loading...</div>}>
      <App />
    </Suspense>
  </StrictMode>
);
