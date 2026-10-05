import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Deep link into a page's object: `#/tasks?task=<id>` hands the id to `open`
 * (typically "open the edit dialog") once, then drops the parameter so a
 * reload or closing the dialog does not reopen it. Used by the command
 * palette.
 */
export function useOpenFromParam(param: string, open: (id: string) => boolean | void): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get(param);
  // `open` may be a fresh function on every render; handle each id only once.
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!id) {
      handled.current = null;
      return;
    }
    if (handled.current === id) return;
    // `open` returns false while the object is not available yet (e.g. data still loading).
    if (open(id) === false) return;
    handled.current = id;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(param);
      return next;
    }, { replace: true });
  }, [id, open, param, setSearchParams]);
}
