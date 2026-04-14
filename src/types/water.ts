export interface WaterEntry {
  id: string;
  bedId: string;
  gardenId: string;
  date: string;
  liters: number;
  method: "manual" | "hose" | "drip" | "sprinkler" | "rain";
  duration?: number; // minutes
  notes?: string;
}
