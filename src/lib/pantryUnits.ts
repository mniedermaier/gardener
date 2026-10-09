import type { PantryItem, PantryUnit } from "@/types/pantry";

/** Legacy free-text labels (all four UI languages) → unit kind. */
const LEGACY: Record<string, PantryUnit> = {};
const SYNONYMS: Record<Exclude<PantryUnit, "other">, string[]> = {
  jar: ["glas", "gläser", "glaeser", "jar", "jars", "tarro", "tarros", "bote", "botes", "bocal", "bocaux"],
  bottle: ["flasche", "flaschen", "bottle", "bottles", "botella", "botellas", "bouteille", "bouteilles"],
  bag: ["beutel", "tüte", "tüten", "gefrierbeutel", "bag", "bags", "bolsa", "bolsas", "sachet", "sachets", "sac", "sacs"],
  can: ["dose", "dosen", "can", "cans", "tin", "tins", "lata", "latas", "boîte", "boîtes", "boite", "boites"],
  pack: ["packung", "packungen", "pack", "packs", "package", "packages", "paquete", "paquetes", "paquet", "paquets"],
  piece: ["stk", "stk.", "stück", "piece", "pieces", "pcs", "pc", "ud", "uds", "uds.", "unidad", "unidades", "pièce", "pièces", "pce", "pces"],
};
for (const [kind, words] of Object.entries(SYNONYMS)) for (const w of words) LEGACY[w] = kind as PantryUnit;

/**
 * The unit of a pantry item: the stored kind, else the kind recognised from a
 * legacy free-text label ("Gläser" → jar), else "other" with that label.
 */
export function resolvePantryUnit(item: Pick<PantryItem, "unitKind" | "unitLabel">): { kind: PantryUnit; label?: string } {
  if (item.unitKind && item.unitKind !== "other") return { kind: item.unitKind };
  const label = item.unitLabel?.trim();
  if (!label) return { kind: item.unitKind === "other" ? "other" : "piece" };
  const known = LEGACY[label.toLocaleLowerCase()];
  return known && item.unitKind !== "other" ? { kind: known } : { kind: "other", label };
}
