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

// Nutrition per 100g of product
export const PRODUCT_NUTRITION: Record<ProductType, { caloriesPer100g: number; proteinPer100g: number }> = {
  eggs: { caloriesPer100g: 155, proteinPer100g: 13 },
  honey: { caloriesPer100g: 304, proteinPer100g: 0.3 },
  meat: { caloriesPer100g: 175, proteinPer100g: 27 },
  wax: { caloriesPer100g: 0, proteinPer100g: 0 },
  milk: { caloriesPer100g: 69, proteinPer100g: 3.3 },
  wool: { caloriesPer100g: 0, proteinPer100g: 0 },
};

/**
 * Typical annual production per animal/hive in a home flock (central Europe):
 * - chicken 220 eggs: hybrids lay 280+ in their first year, heritage breeds
 *   150–200; moult, winter break and older hens are averaged in.
 * - duck 150 eggs (runner ducks up to 200), quail 300 eggs (small, ~11 g).
 * - rabbit 2.5 kg: one fattening rabbit's carcass per counted animal.
 * - bee colony 20 kg honey (German average 2020s ≈ 25–35 kg; conservative
 *   for hobby hives) and 0.5 kg wax.
 * - goat 800 l milk per lactation, sheep 4 kg raw wool + 20 kg lamb meat.
 */
export const ANNUAL_YIELD: Record<AnimalType, { product: ProductType; quantity: number; unit: string }[]> = {
  chicken: [{ product: "eggs", quantity: 220, unit: "pieces" }],
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

/** Average egg weight (edible part incl. shell is close enough) per laying species, kg. */
export const EGG_WEIGHT_KG_BY_ANIMAL: Partial<Record<AnimalType, number>> = {
  chicken: 0.06,
  duck: 0.075,
  quail: 0.011,
};

/** Animal types that lay eggs (quick egg log). */
export const EGG_LAYERS: AnimalType[] = ["chicken", "duck", "quail"];
