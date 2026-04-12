export interface HarvestEntry {
  id: string;
  gardenId: string;
  bedId: string;
  plantId: string;
  date: string;
  weightGrams?: number;
  count?: number;
  quality: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}
