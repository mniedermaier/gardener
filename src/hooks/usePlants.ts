import { useMemo } from "react";
import plantsData from "@/data/plants.json";
import type { Plant } from "@/types/plant";
import { useStore } from "@/store";

const builtinPlants: Plant[] = plantsData as Plant[];

export function usePlants(): Plant[] {
  const customPlants = useStore((s) => s.customPlants);
  return useMemo(() => {
    const customIds = new Set(customPlants.map((p) => p.id));
    // Custom plants override built-in ones with the same ID
    const filtered = builtinPlants.filter((p) => !customIds.has(p.id));
    return [...filtered, ...customPlants];
  }, [customPlants]);
}

export function useBuiltinPlants(): Plant[] {
  return builtinPlants;
}

export function usePlant(id: string) {
  const customPlants = useStore((s) => s.customPlants);
  return useMemo(() => {
    const custom = customPlants.find((p) => p.id === id);
    if (custom) return custom;
    return builtinPlants.find((p) => p.id === id);
  }, [id, customPlants]);
}

export function usePlantMap() {
  const customPlants = useStore((s) => s.customPlants);
  return useMemo(() => {
    const map = new Map<string, Plant>();
    for (const p of builtinPlants) map.set(p.id, p);
    for (const p of customPlants) map.set(p.id, p);
    return map;
  }, [customPlants]);
}
