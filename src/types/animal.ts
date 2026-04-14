export type AnimalType = "chicken" | "duck" | "rabbit" | "bee";
export type ProductType = "eggs" | "honey" | "meat" | "wax";

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
};

export const PRODUCT_ICONS: Record<ProductType, string> = {
  eggs: "\ud83e\udd5a",
  honey: "\ud83c\udf6f",
  meat: "\ud83e\udd69",
  wax: "\ud83d\udeaf",
};

// Nutrition per 100g of product
export const PRODUCT_NUTRITION: Record<ProductType, { caloriesPer100g: number; proteinPer100g: number }> = {
  eggs: { caloriesPer100g: 155, proteinPer100g: 13 },
  honey: { caloriesPer100g: 304, proteinPer100g: 0.3 },
  meat: { caloriesPer100g: 175, proteinPer100g: 27 },
  wax: { caloriesPer100g: 0, proteinPer100g: 0 },
};

// Estimated annual production per animal/hive
export const ANNUAL_YIELD: Record<AnimalType, { product: ProductType; quantity: number; unit: string }[]> = {
  chicken: [{ product: "eggs", quantity: 250, unit: "pieces" }],
  duck: [{ product: "eggs", quantity: 150, unit: "pieces" }],
  rabbit: [{ product: "meat", quantity: 2.5, unit: "kg" }],
  bee: [{ product: "honey", quantity: 20, unit: "kg" }, { product: "wax", quantity: 0.5, unit: "kg" }],
};
