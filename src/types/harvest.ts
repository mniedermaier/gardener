export interface HarvestEntry {
  id: string;
  gardenId: string;
  bedId: string;
  plantId: string;
  date: string;
  weightGrams?: number;
  count?: number;
  /** Optional: unrated harvests do not pull the average (no preset "Sehr gut"). */
  quality?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}
