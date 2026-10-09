import type { TFunction } from "i18next";

/**
 * Two well-known cultivars per common crop, used as the variety placeholder
 * ("z. B. Matador, Giant Winter" for spinach). Cultivar names are proper names
 * and stay the same in every locale. Plants without an entry get a neutral
 * "z. B. Sortenname".
 */
export const VARIETY_EXAMPLES: Readonly<Record<string, readonly string[]>> = {
  tomato: ["San Marzano", "Black Krim"],
  zucchini: ["Black Beauty", "Costata Romanesco"],
  carrot: ["Nantaise", "Chantenay"],
  lettuce: ["Lollo Rosso", "Little Gem"],
  bean: ["Cobra", "Blauhilde"],
  pea: ["Kelvedon Wonder", "Hurst Green Shaft"],
  radish: ["Cherry Belle", "French Breakfast"],
  cucumber: ["Marketmore", "Delikatess"],
  pepper: ["California Wonder", "Corno di Toro"],
  onion: ["Stuttgarter Riesen", "Red Baron"],
  potato: ["Linda", "Charlotte"],
  strawberry: ["Senga Sengana", "Mara des Bois"],
  raspberry: ["Autumn Bliss", "Tulameen"],
  blueberry: ["Bluecrop", "Duke"],
  basil: ["Genovese", "Thai"],
  kale: ["Nero di Toscana", "Redbor"],
  spinach: ["Matador", "Giant Winter"],
  beetroot: ["Detroit", "Chioggia"],
  leek: ["Bleu de Solaise", "Carentan"],
  pumpkin: ["Hokkaido", "Muscat de Provence"],
  chard: ["Bright Lights", "Lucullus"],
  kohlrabi: ["Azur Star", "Superschmelz"],
  corn: ["Golden Bantam", "Damaun"],
  cabbage: ["Golden Acre", "Red Express"],
  broccoli: ["Calabrese", "Purple Sprouting"],
  cauliflower: ["Snowball", "Romanesco"],
  eggplant: ["Black Beauty", "Listada de Gandia"],
  squash: ["Waltham Butternut", "Delicata"],
};

/** Placeholder for a variety field of the given plant. */
export function varietyPlaceholder(t: TFunction, plantId: string | undefined): string {
  const examples = plantId ? VARIETY_EXAMPLES[plantId] : undefined;
  return examples ? t("planner.varietyPlaceholderFor", { examples: examples.join(", ") }) : t("planner.varietyPlaceholder");
}
