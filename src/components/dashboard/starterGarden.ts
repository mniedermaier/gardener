import type { TFunction } from "i18next";
import { useStore } from "@/store";
import type { Bed, CellPlanting } from "@/types/garden";

type Rect = [plantId: string, x0: number, y0: number, x1: number, y1: number];

interface StarterBed {
  nameKey: string;
  bed: Omit<Bed, "id" | "cells" | "name">;
  plan: Rect[];
}

// Three small beds that cover a typical first season: salads and roots, a
// main crop bed and a herb pot. Neighbours are companion-friendly.
const STARTER_BEDS: StarterBed[] = [
  {
    nameKey: "onboarding.starter.raisedBed",
    bed: { x: 0, y: 0, width: 4, height: 6, environmentType: "raised_bed", raisedBedConfig: { heightCm: 70 } },
    plan: [
      ["lettuce", 0, 0, 3, 0], ["radish", 0, 1, 3, 1], ["carrot", 0, 2, 3, 3],
      ["onion", 0, 4, 1, 5], ["beetroot", 2, 4, 3, 5],
    ],
  },
  {
    nameKey: "onboarding.starter.vegBed",
    bed: { x: 5, y: 0, width: 6, height: 4, environmentType: "outdoor_bed" },
    plan: [
      ["potato", 0, 0, 2, 1], ["bean", 3, 0, 5, 1],
      ["zucchini", 0, 2, 1, 3], ["kale", 2, 2, 3, 3], ["chard", 4, 2, 5, 3],
    ],
  },
  {
    nameKey: "onboarding.starter.herbPot",
    bed: { x: 0, y: 7, width: 2, height: 2, environmentType: "container", containerConfig: { volumeLiters: 40, material: "terracotta" } },
    plan: [["basil", 0, 0, 0, 0], ["parsley", 1, 0, 1, 0], ["chives", 0, 1, 0, 1], ["thyme", 1, 1, 1, 1]],
  },
];

function cellsFor(plan: Rect[]): CellPlanting[] {
  const cells: CellPlanting[] = [];
  for (const [plantId, x0, y0, x1, y1] of plan)
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) cells.push({ cellX: x, cellY: y, plantId });
  return cells;
}

/** Creates a garden with three planted example beds and returns its id. */
export function createStarterGarden(name: string, t: TFunction): string {
  const { addGarden, addBed, updateBed } = useStore.getState();
  const gardenId = addGarden(name);
  for (const starter of STARTER_BEDS) {
    addBed(gardenId, { ...starter.bed, name: t(starter.nameKey) });
    const garden = useStore.getState().gardens.find((g) => g.id === gardenId);
    const bed = garden?.beds[garden.beds.length - 1];
    if (!bed) continue;
    updateBed(gardenId, bed.id, { cells: cellsFor(starter.plan) });
  }
  return gardenId;
}
