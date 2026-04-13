export type SeedSource = "shop" | "saved" | "traded" | "gifted";
export type SeedUnit = "packets" | "grams" | "seeds";

export interface SeedItem {
  id: string;
  plantId: string;
  variety?: string;
  quantity: number;
  unit: SeedUnit;
  yearAcquired: number;
  source: SeedSource;
  shopName?: string;
  cost?: number;
  notes?: string;
}
