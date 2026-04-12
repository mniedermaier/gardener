import type { Garden } from "@/types/garden";

interface SharedGardenTemplate {
  v: 1;
  name: string;
  beds: Array<{
    name: string;
    w: number;
    h: number;
    env: string;
    cells: Array<[number, number, string]>; // [x, y, plantId]
  }>;
}

function gardenToTemplate(garden: Garden): SharedGardenTemplate {
  return {
    v: 1,
    name: garden.name,
    beds: garden.beds.map((b) => ({
      name: b.name,
      w: b.width,
      h: b.height,
      env: b.environmentType ?? "outdoor_bed",
      cells: b.cells.map((c) => [c.cellX, c.cellY, c.plantId]),
    })),
  };
}

export function encodeGardenToUrl(garden: Garden): string {
  const template = gardenToTemplate(garden);
  const json = JSON.stringify(template);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return encoded;
}

export function decodeGardenFromUrl(encoded: string): SharedGardenTemplate | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const template = JSON.parse(json) as SharedGardenTemplate;
    if (template.v !== 1 || !template.name || !Array.isArray(template.beds)) {
      return null;
    }
    return template;
  } catch {
    return null;
  }
}

export function generateShareUrl(garden: Garden): string {
  const encoded = encodeGardenToUrl(garden);
  const base = window.location.origin + window.location.pathname;
  return `${base}#/import?t=${encoded}`;
}

export function importTemplateToStore(
  template: SharedGardenTemplate,
  addGarden: (name: string) => string,
  addBed: (gardenId: string, bed: { name: string; x: number; y: number; width: number; height: number; environmentType: string }) => void,
  setCell: (gardenId: string, bedId: string, cell: { cellX: number; cellY: number; plantId: string }) => void,
  getState: () => { gardens: Garden[] },
) {
  const gardenId = addGarden(`${template.name} (imported)`);
  for (let i = 0; i < template.beds.length; i++) {
    const bed = template.beds[i];
    addBed(gardenId, {
      name: bed.name,
      x: 0,
      y: i,
      width: bed.w,
      height: bed.h,
      environmentType: bed.env as Garden["beds"][0]["environmentType"],
    });
    const currentGarden = getState().gardens.find((g) => g.id === gardenId);
    const newBed = currentGarden?.beds[currentGarden.beds.length - 1];
    if (newBed) {
      for (const [x, y, plantId] of bed.cells) {
        setCell(gardenId, newBed.id, { cellX: x, cellY: y, plantId });
      }
    }
  }
  return gardenId;
}
