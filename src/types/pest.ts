export interface PestEntry {
  id: string;
  plantId: string;
  bedId: string;
  date: string;
  type: "pest" | "disease";
  name: string;
  severity: 1 | 2 | 3 | 4 | 5;
  description?: string;
  treatment?: string;
  treatmentDate?: string;
  organic: boolean;
  resolved: boolean;
  resolvedDate?: string;
}
