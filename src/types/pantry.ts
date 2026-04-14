import type { PreservationMethod } from "./plant";

export interface PantryItem {
  id: string;
  plantId: string;
  method: PreservationMethod;
  quantityKg: number;
  /** Number of units (jars, bags, etc.) */
  units?: number;
  unitLabel?: string;
  date: string;
  expiresDate: string;
  /** Batch label, e.g. "Tomato Sauce Aug 2026" */
  label?: string;
  notes?: string;
  consumed: boolean;
  consumedDate?: string;
  /** Cost of supplies (jars, lids, bags) */
  supplyCost?: number;
}

/** Shelf life in months per preservation method */
export const SHELF_LIFE_MONTHS: Record<PreservationMethod, number> = {
  freezing: 12,
  canning: 24,
  fermenting: 6,
  drying: 12,
  root_cellar: 6,
};

/** Approximate yield ratio: 1kg fresh → X kg preserved */
export const PRESERVATION_YIELD: Record<PreservationMethod, number> = {
  freezing: 0.95,
  canning: 0.80,
  fermenting: 0.85,
  drying: 0.25,
  root_cellar: 0.95,
};

/** Icons per method */
export const METHOD_ICONS: Record<PreservationMethod, string> = {
  canning: "🫙",
  freezing: "🧊",
  fermenting: "🫧",
  drying: "☀️",
  root_cellar: "🏚️",
};

/** Preservation tips per method (translation keys) */
export const METHOD_TIPS_KEY = "pantry.tips";

/** Per-plant preservation guides — keys map to translation keys */
export const PLANT_PRESERVATION_GUIDES: Record<string, PreservationMethod[]> = {
  tomato: ["canning", "freezing", "drying"],
  cucumber: ["fermenting", "canning"],
  pepper: ["freezing", "drying", "canning"],
  zucchini: ["freezing", "canning", "drying"],
  bean: ["freezing", "canning", "drying"],
  pea: ["freezing", "canning"],
  carrot: ["root_cellar", "freezing", "canning"],
  beetroot: ["root_cellar", "fermenting", "canning"],
  potato: ["root_cellar"],
  onion: ["root_cellar", "drying"],
  garlic: ["root_cellar", "drying"],
  cabbage: ["fermenting", "root_cellar", "freezing"],
  kale: ["freezing", "drying"],
  spinach: ["freezing"],
  leek: ["freezing", "root_cellar"],
  pumpkin: ["root_cellar", "canning", "freezing"],
  squash: ["root_cellar", "canning", "freezing"],
  corn: ["freezing", "canning", "drying"],
  eggplant: ["freezing", "canning"],
  strawberry: ["freezing", "canning", "drying"],
  raspberry: ["freezing", "canning"],
  blueberry: ["freezing", "canning", "drying"],
  apple: ["root_cellar", "canning", "drying"],
  pear: ["root_cellar", "canning"],
  plum: ["canning", "freezing", "drying"],
  cherry: ["canning", "freezing"],
  herb_basil: ["freezing", "drying"],
  herb_parsley: ["freezing", "drying"],
  herb_dill: ["freezing", "drying"],
  herb_chives: ["freezing", "drying"],
  radish: ["fermenting"],
  celery: ["freezing", "root_cellar"],
  broccoli: ["freezing"],
  cauliflower: ["freezing"],
};
