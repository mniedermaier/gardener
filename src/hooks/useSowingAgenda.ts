import { useMemo, useState } from "react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants } from "@/hooks/usePlants";
import { getGardenSowingAgenda, type AgendaBedContext } from "@/lib/advisor";
import { getFrostProtectionWeeks } from "@/types/garden";

/**
 * "Jetzt säen & pflanzen" for the whole garden: the union of every bed's
 * palette (`getPlantableNow` with the bed's type and frost protection), each
 * row naming its beds, plus sowing indoors. The one agenda the dashboard and
 * the calendar show — a crop appears here exactly when a bed's palette offers it.
 */
export function useSowingAgenda() {
  const { lastFrostDate, gardens } = useStore(useShallow((s) => ({ lastFrostDate: s.lastFrostDate, gardens: s.gardens })));
  const plants = usePlants();
  const [now] = useState(() => new Date());
  const beds = useMemo<AgendaBedContext[]>(
    () => gardens.flatMap((g) => g.beds.map((b) => ({
      id: b.id,
      name: gardens.length > 1 ? `${g.name} · ${b.name}` : b.name,
      environmentType: b.environmentType ?? "outdoor_bed",
      frostProtectionWeeks: getFrostProtectionWeeks(b),
      freeCells: b.width * b.height - new Set(b.paths ?? []).size - b.cells.length,
      plantIds: [...new Set(b.cells.map((c) => c.plantId))],
    }))),
    [gardens],
  );
  return useMemo(() => getGardenSowingAgenda(plants, lastFrostDate, beds, { now }), [plants, lastFrostDate, beds, now]);
}
