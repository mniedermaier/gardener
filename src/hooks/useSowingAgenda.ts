import { useMemo, useState } from "react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants } from "@/hooks/usePlants";
import { getSowingAgenda } from "@/lib/advisor";

/**
 * "Jetzt säen & pflanzen" for an outdoor bed, incl. sowing indoors: the one
 * agenda the dashboard and the calendar show (the planner palette asks
 * `getPlantableNow` with the open bed's type and frost protection).
 */
export function useSowingAgenda() {
  const lastFrostDate = useStore(useShallow((s) => s.lastFrostDate));
  const plants = usePlants();
  const [now] = useState(() => new Date());
  return useMemo(() => getSowingAgenda(plants, lastFrostDate, { now, includeIndoor: true }), [plants, lastFrostDate, now]);
}
