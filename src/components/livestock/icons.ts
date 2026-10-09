import { Bandage, Beef, Bird, ClipboardList, Egg, Feather, Flame, HeartCrack, Hexagon, Milk, Pill, Rabbit, Spool, Stethoscope, Syringe, Thermometer, Worm, type LucideIcon } from "lucide-react";
import type { AnimalType, HealthEventType, ProductType } from "@/types/animal";
import type { Tone } from "@/components/ui/tone";

/** One icon language: Lucide for animals, products and health events (no UI emoji). */
export const ANIMAL_ICON: Record<AnimalType, LucideIcon> = {
  // One glyph per species so the tiles can be told apart; where lucide has no
  // animal, the species' main product stands in (quail eggs, goat milk, wool).
  chicken: Bird,
  duck: Feather,
  quail: Egg,
  rabbit: Rabbit,
  bee: Hexagon,
  goat: Milk,
  sheep: Spool,
};

export const PRODUCT_ICON: Record<ProductType, LucideIcon> = {
  eggs: Egg,
  honey: Hexagon, // honeycomb cell
  meat: Beef,
  wax: Flame, // candle wax
  milk: Milk,
  wool: Spool,
};

export const HEALTH_ICON: Record<HealthEventType, LucideIcon> = {
  vaccination: Syringe,
  deworming: Worm,
  illness: Thermometer,
  injury: Bandage,
  checkup: Stethoscope,
  treatment: Pill, // PillBottle read as a trash can at 16 px
  death: HeartCrack,
  other: ClipboardList,
};

/** Health events that need attention get a status tone; routine ones stay neutral. */
export const HEALTH_TONE: Record<HealthEventType, Tone> = {
  vaccination: "neutral",
  deworming: "neutral",
  illness: "warning",
  injury: "warning",
  checkup: "neutral",
  treatment: "neutral",
  death: "danger",
  other: "neutral",
};
