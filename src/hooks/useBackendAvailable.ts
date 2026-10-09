import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/nativeStorage";

let probe: Promise<boolean> | null = null;

/**
 * Whether this build is served next to the Gardener backend (the Docker
 * image proxies /api/ on the same origin). GitHub Pages and the store apps
 * have none, so Settings hides the sync section there instead of offering a
 * field that can never work. Probed once per session.
 */
function probeSameOrigin(): Promise<boolean> {
  probe ??= fetch(`${import.meta.env.BASE_URL}api/health`, { signal: AbortSignal.timeout(3000) })
    // 401: a backend with GARDENER_TOKEN. A static host answers 404 or the
    // SPA fallback (HTML with 200), which must not count.
    .then((res) => res.status === 401 || (res.ok && (res.headers.get("content-type") ?? "").includes("json")))
    .catch(() => false);
  return probe;
}

/** True when a backend is configured or reachable on this origin. */
export function useBackendAvailable(configuredUrl: string | null): boolean {
  const [sameOrigin, setSameOrigin] = useState(false);
  useEffect(() => {
    if (configuredUrl || isNativeApp()) return;
    let cancelled = false;
    void probeSameOrigin().then((ok) => { if (!cancelled) setSameOrigin(ok); });
    return () => { cancelled = true; };
  }, [configuredUrl]);
  return Boolean(configuredUrl) || sameOrigin;
}
