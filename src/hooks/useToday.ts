import { useEffect, useState } from "react";

/**
 * The current date, stable across renders so components stay pure.
 * Refreshes shortly after local midnight while the page stays open.
 */
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const midnight = new Date(today);
    midnight.setHours(24, 0, 0, 0);
    const id = setTimeout(() => setToday(new Date()), midnight.getTime() - Date.now() + 1000);
    return () => clearTimeout(id);
  }, [today]);

  return today;
}
