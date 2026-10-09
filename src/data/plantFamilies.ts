export type PlantFamily =
  | "solanaceae"    // Nachtschattengewächse: Tomate, Paprika, Kartoffel
  | "cucurbitaceae" // Kürbisgewächse: Zucchini, Gurke, Kürbis
  | "fabaceae"      // Hülsenfrüchte: Bohne, Erbse
  | "brassicaceae"  // Kreuzblütler: Kohl, Brokkoli, Kohlrabi, Radieschen
  | "apiaceae"      // Doldenblütler: Karotte, Sellerie, Fenchel, Petersilie, Dill
  | "amaryllidaceae"// Lauchgewächse: Zwiebel, Knoblauch, Lauch, Schnittlauch
  | "asteraceae"    // Korbblütler: Kopfsalat, Sonnenblume
  | "chenopodiaceae"// Gänsefußgewächse: Spinat, Rote Bete, Mangold
  | "poaceae"       // Süßgräser: Mais
  | "lamiaceae"     // Lippenblütler: Basilikum, Minze, Rosmarin, Thymian
  | "rosaceae"      // Rosengewächse: Erdbeere, Himbeere
  | "ericaceae"     // Heidekrautgewächse: Heidelbeere
  | "grossulariaceae" // Stachelbeergewächse: Johannisbeere, Stachelbeere
  | "other";

export const plantFamilyMap: Record<string, PlantFamily> = {
  tomato: "solanaceae",
  pepper: "solanaceae",
  potato: "solanaceae",
  zucchini: "cucurbitaceae",
  cucumber: "cucurbitaceae",
  pumpkin: "cucurbitaceae",
  bean: "fabaceae",
  pea: "fabaceae",
  cabbage: "brassicaceae",
  broccoli: "brassicaceae",
  cauliflower: "brassicaceae",
  kohlrabi: "brassicaceae",
  kale: "brassicaceae",
  radish: "brassicaceae",
  turnip: "brassicaceae",
  carrot: "apiaceae",
  celery: "apiaceae",
  fennel: "apiaceae",
  parsley: "apiaceae",
  dill: "apiaceae",
  onion: "amaryllidaceae",
  garlic: "amaryllidaceae",
  leek: "amaryllidaceae",
  chives: "amaryllidaceae",
  lettuce: "asteraceae",
  sunflower: "asteraceae",
  spinach: "chenopodiaceae",
  beetroot: "chenopodiaceae",
  chard: "chenopodiaceae",
  corn: "poaceae",
  basil: "lamiaceae",
  mint: "lamiaceae",
  rosemary: "lamiaceae",
  thyme: "lamiaceae",
  strawberry: "rosaceae",
  raspberry: "rosaceae",
  blueberry: "ericaceae",
  currant: "grossulariaceae",
  gooseberry: "grossulariaceae",
  eggplant: "solanaceae",
  arugula: "brassicaceae",
  squash: "cucurbitaceae",
  asparagus: "other",
  lambs_lettuce: "other", // Feldsalat: Geißblattgewächse (früher Baldriangewächse), fruchtfolgeneutral
  pak_choi: "brassicaceae",
  endive: "asteraceae",
};

/**
 * Muted categorical palette (mid lightness, low chroma) that reads on white
 * and on the dark surface alike. Neighbours in the rotation order get clearly
 * different hues; meaning is always repeated in text next to the swatch.
 */
export const familyColors: Record<PlantFamily, string> = {
  solanaceae: "#c0675c",
  cucurbitaceae: "#c9a54e",
  fabaceae: "#8f7fb8",
  brassicaceae: "#5c8fab",
  apiaceae: "#d38b5d",
  amaryllidaceae: "#98a65f",
  asteraceae: "#5fa384",
  chenopodiaceae: "#a95f80",
  poaceae: "#b3a387",
  lamiaceae: "#6f9c9c",
  rosaceae: "#d0919b",
  ericaceae: "#6c7fb5",
  grossulariaceae: "#8b6a8f",
  other: "#a6a297",
};

export const familyNameKeys: Record<PlantFamily, { de: string; en: string }> = {
  solanaceae: { de: "Nachtschattengewächse", en: "Nightshades" },
  cucurbitaceae: { de: "Kürbisgewächse", en: "Cucurbits" },
  fabaceae: { de: "Hülsenfrüchte", en: "Legumes" },
  brassicaceae: { de: "Kreuzblütler", en: "Brassicas" },
  apiaceae: { de: "Doldenblütler", en: "Umbellifers" },
  amaryllidaceae: { de: "Lauchgewächse", en: "Alliums" },
  asteraceae: { de: "Korbblütler", en: "Composites" },
  chenopodiaceae: { de: "Gänsefußgewächse", en: "Amaranths" },
  poaceae: { de: "Süßgräser", en: "Grasses" },
  lamiaceae: { de: "Lippenblütler", en: "Mints" },
  rosaceae: { de: "Rosengewächse", en: "Rose family" },
  ericaceae: { de: "Heidekrautgewächse", en: "Heathers" },
  grossulariaceae: { de: "Stachelbeergewächse", en: "Gooseberry family" },
  other: { de: "Sonstige", en: "Other" },
};

// Recommended rotation order: heavy feeders -> medium -> light/legumes -> rest
export const rotationGroups = [
  { families: ["solanaceae", "cucurbitaceae"] as PlantFamily[], label: { de: "Starkzehrer", en: "Heavy feeders" } },
  { families: ["brassicaceae", "apiaceae", "asteraceae"] as PlantFamily[], label: { de: "Mittelzehrer", en: "Medium feeders" } },
  { families: ["chenopodiaceae", "amaryllidaceae"] as PlantFamily[], label: { de: "Schwachzehrer", en: "Light feeders" } },
  { families: ["fabaceae"] as PlantFamily[], label: { de: "Bodenverbesserer", en: "Soil improvers" } },
];
