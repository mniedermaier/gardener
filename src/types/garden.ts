export type EnvironmentType =
  | "outdoor_bed"
  | "raised_bed"
  | "greenhouse"
  | "cold_frame"
  | "polytunnel"
  | "container"
  | "windowsill"
  | "vertical";

export interface GreenhouseConfig {
  material: "glass" | "polycarbonate" | "plastic";
  heated: boolean;
  heatingType?: "electric" | "gas" | "passive_solar";
  ventilation: "manual" | "automatic";
  minTempC: number;
  maxTempC: number;
  frostProtectionWeeks: number;
}

export interface ContainerConfig {
  volumeLiters: number;
  material: "terracotta" | "plastic" | "fabric" | "wood" | "metal";
}

export interface RaisedBedConfig {
  heightCm: number;
  layers?: string[];
}

export interface ColdFrameConfig {
  frostProtectionWeeks: number;
}

export interface CellPlanting {
  cellX: number;
  cellY: number;
  plantId: string;
  variety?: string;
  plantedDate?: string;
  notes?: string;
}

export interface Bed {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cells: CellPlanting[];
  paths?: string[]; // "x-y" keys for path cells
  environmentType: EnvironmentType;
  greenhouseConfig?: GreenhouseConfig;
  containerConfig?: ContainerConfig;
  raisedBedConfig?: RaisedBedConfig;
  coldFrameConfig?: ColdFrameConfig;
}

export interface Garden {
  id: string;
  name: string;
  beds: Bed[];
  season: string; // e.g. "2026"
  createdAt: string;
  updatedAt: string;
}

export interface SeasonArchive {
  season: string;
  gardenId: string;
  gardenName: string;
  beds: Bed[];
  archivedAt: string;
}

export const ENVIRONMENT_ICONS: Record<EnvironmentType, string> = {
  outdoor_bed: "\ud83c\udf31",
  raised_bed: "\ud83e\uddf1",
  greenhouse: "\ud83c\udfe1",
  cold_frame: "\u2744\ufe0f",
  polytunnel: "\ud83c\udf08",
  container: "\ud83e\udeb4",
  windowsill: "\ud83e\uddf4",
  vertical: "\u2b06\ufe0f",
};

export const ENVIRONMENT_FROST_PROTECTION: Record<EnvironmentType, number> = {
  outdoor_bed: 0,
  raised_bed: 1,
  greenhouse: 0,  // uses config value
  cold_frame: 0,  // uses config value
  polytunnel: 3,
  container: 0,
  windowsill: 8,
  vertical: 0,
};

export function getFrostProtectionWeeks(bed: Bed): number {
  if (bed.environmentType === "greenhouse" && bed.greenhouseConfig) {
    return bed.greenhouseConfig.frostProtectionWeeks;
  }
  if (bed.environmentType === "cold_frame" && bed.coldFrameConfig) {
    return bed.coldFrameConfig.frostProtectionWeeks;
  }
  return ENVIRONMENT_FROST_PROTECTION[bed.environmentType];
}
