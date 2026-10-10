import { useSyncExternalStore } from "react";

const QUERY = "(pointer: fine)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/**
 * Mouse or trackpad as the primary pointer: hints then say "Klicke …"
 * instead of "Tippe …". Touch is the fallback (also on the server/in tests).
 */
export function usePointerFine(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
