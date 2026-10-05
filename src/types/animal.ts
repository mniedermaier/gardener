export type AnimalType = "chicken" | "duck" | "rabbit" | "bee" | "goat" | "sheep" | "quail";
export type ProductType = "eggs" | "honey" | "meat" | "wax" | "milk" | "wool";

export interface Animal {
  id: string;
  type: AnimalType;
  name?: string;
  count: number;
  acquiredDate: string;
  notes?: string;
}

export interface AnimalProduct {
  id: string;
  animalId: string;
  type: ProductType;
  date: string;
  quantity: number;
  unit: "pieces" | "kg" | "g" | "liters";
  notes?: string;
}

export type HealthEventType = "vaccination" | "deworming" | "illness" | "injury" | "checkup" | "treatment" | "death" | "other";

export interface HealthEvent {
  id: string;
  animalId: string;
  date: string;
  type: HealthEventType;
  description: string;
  cost?: number;
  notes?: string;
}

export interface FeedEntry {
  id: string;
  animalId: string;
  date: string;
  feedType: string;
  quantity: number;
  unit: "kg" | "g" | "liters";
  cost?: number;
  notes?: string;
}

export const ANIMAL_ICONS: Record<AnimalType, string> = {
  chicken: "\ud83d\udc14",
  duck: "\ud83e\udd86",
  rabbit: "\ud83d\udc30",
  bee: "\ud83d\udc1d",
  goat: "🐐",
  sheep: "🐑",
  quail: "🐦",
};

/**
 * Legacy emoji maps. The UI uses Lucide icons from
 * `components/livestock/icons.ts`; these stay only for older call sites.
 */
export const PRODUCT_ICONS: Record<ProductType, string> = {
  eggs: "\ud83e\udd5a",
  honey: "\ud83c\udf6f",
  meat: "\ud83e\udd69",
  wax: "\ud83d\udd6f\ufe0f",
  milk: "🥛",
  wool: "🧶",
};

// Nutrition per 100g of product
export const PRODUCT_NUTRITION: Record<ProductType, { caloriesPer100g: number; proteinPer100g: number }> = {
  eggs: { caloriesPer100g: 155, proteinPer100g: 13 },
  honey: { caloriesPer100g: 304, proteinPer100g: 0.3 },
  meat: { caloriesPer100g: 175, proteinPer100g: 27 },
  wax: { caloriesPer100g: 0, proteinPer100g: 0 },
  milk: { caloriesPer100g: 69, proteinPer100g: 3.3 },
  wool: { caloriesPer100g: 0, proteinPer100g: 0 },
};

// Estimated annual production per animal/hive
export const ANNUAL_YIELD: Record<AnimalType, { product: ProductType; quantity: number; unit: string }[]> = {
  chicken: [{ product: "eggs", quantity: 250, unit: "pieces" }],
  duck: [{ product: "eggs", quantity: 150, unit: "pieces" }],
  rabbit: [{ product: "meat", quantity: 2.5, unit: "kg" }],
  bee: [{ product: "honey", quantity: 20, unit: "kg" }, { product: "wax", quantity: 0.5, unit: "kg" }],
  goat: [{ product: "milk", quantity: 800, unit: "liters" }],
  sheep: [{ product: "wool", quantity: 4, unit: "kg" }, { product: "meat", quantity: 20, unit: "kg" }],
  quail: [{ product: "eggs", quantity: 300, unit: "pieces" }],
};

/** Unit each product is recorded in. Eggs are counted, milk in litres, the rest in kg. */
export const PRODUCT_UNIT: Record<ProductType, AnimalProduct["unit"]> = {
  eggs: "pieces",
  honey: "kg",
  meat: "kg",
  wax: "kg",
  milk: "liters",
  wool: "kg",
};

/** Which products an animal type yields — drives the product picker. */
export const PRODUCT_TYPES_BY_ANIMAL: Record<AnimalType, ProductType[]> = {
  chicken: ["eggs", "meat"],
  duck: ["eggs", "meat"],
  rabbit: ["meat"],
  bee: ["honey", "wax"],
  goat: ["milk", "meat"],
  sheep: ["wool", "meat"],
  quail: ["eggs"],
};

/** Animal types that lay eggs (quick egg log). */
export const EGG_LAYERS: AnimalType[] = ["chicken", "duck", "quail"];
