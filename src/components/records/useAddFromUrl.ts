import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/** Query parameters that open a page's add dialog pre-filled. */
export interface AddParams {
  plant?: string;
  bed?: string;
  animal?: string;
  date?: string;
}

const KEYS = ["add", "plant", "bed", "animal", "date"] as const;

/**
 * Deep link into an add dialog, e.g. from a planner cell:
 *   #/harvest?plant=tomato&bed=b-gh
 *   #/journal?add=1&bed=b-gh
 * Any of add/plant/bed/animal/date opens the dialog; the parameters are
 * removed afterwards so reload or back does not reopen it.
 */
export function useAddFromUrl(open: (params: AddParams) => void): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const triggered = KEYS.some((k) => searchParams.has(k));

  useEffect(() => {
    if (!triggered) return;
    const get = (k: string) => searchParams.get(k) || undefined;
    const date = get("date");
    open({ plant: get("plant"), bed: get("bed"), animal: get("animal"), date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined });
    setSearchParams({}, { replace: true });
  }, [triggered, searchParams, setSearchParams, open]);
}
