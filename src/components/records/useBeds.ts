import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import type { EnvironmentType } from "@/types/garden";

export interface BedInfo {
  id: string;
  name: string;
  /** Bed name, prefixed with the garden only when there is more than one garden. */
  label: string;
  gardenId: string;
  gardenName: string;
  environmentType: EnvironmentType;
  /** Plant ids currently planted in this bed. */
  plantIds: Set<string>;
}

/** All beds of all gardens, labelled without repeating a lone garden's name. */
export function useBeds() {
  const gardens = useStore(useShallow((s) => s.gardens));
  return useMemo(() => {
    const multi = gardens.length > 1;
    const list: BedInfo[] = [];
    for (const g of gardens) {
      for (const b of g.beds) {
        list.push({
          id: b.id,
          name: b.name,
          label: multi ? `${g.name} · ${b.name}` : b.name,
          gardenId: g.id,
          gardenName: g.name,
          environmentType: b.environmentType ?? "outdoor_bed",
          plantIds: new Set(b.cells.map((c) => c.plantId)),
        });
      }
    }
    const byId = new Map(list.map((b) => [b.id, b]));
    const options = list.map((b) => ({ value: b.id, label: b.label }));
    return { beds: list, byId, options, label: (id?: string) => (id ? byId.get(id)?.label : undefined) };
  }, [gardens]);
}
