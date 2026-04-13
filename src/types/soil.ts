export interface SoilTest {
  id: string;
  bedId: string;
  date: string;
  ph: number;
  nitrogen: number;   // ppm
  phosphorus: number;  // ppm
  potassium: number;   // ppm
  organicMatter?: number; // percent
  notes?: string;
}

export type AmendmentType = "compost" | "manure" | "lime" | "sulfur" | "fertilizer" | "mulch" | "other";

export interface Amendment {
  id: string;
  bedId: string;
  date: string;
  type: AmendmentType;
  material: string;
  quantityKg: number;
  cost?: number;
  notes?: string;
}
