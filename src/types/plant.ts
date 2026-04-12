export type PlantCategory = "vegetable" | "fruit" | "berry" | "herb";
export type SunRequirement = "full" | "partial" | "shade";
export type WaterNeed = "low" | "medium" | "high";
export type PreservationMethod = "canning" | "freezing" | "fermenting" | "drying" | "root_cellar";

export interface SeedSavingInfo {
  difficulty: "easy" | "moderate" | "advanced";
  isolationDistanceM?: number;
  seedViabilityYears: number;
}

export interface Plant {
  id: string;
  category: PlantCategory;
  sowIndoorsWeeks: number | null;
  sowOutdoorsWeeks: number | null;
  transplantWeeks: number | null;
  harvestDaysMin: number;
  harvestDaysMax: number;
  spacingCm: number;
  rowSpacingCm: number;
  sunRequirement: SunRequirement;
  waterNeed: WaterNeed;
  companions: string[];
  antagonists: string[];
  color: string;
  icon: string;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  vitaminCPer100g?: number;
  fiberPer100g?: number;
  expectedYieldKgPerM2?: number;
  preservationMethods?: PreservationMethod[];
  seedSaving?: SeedSavingInfo;
}
