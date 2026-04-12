export interface PlantGuild {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  plants: Array<{
    plantId: string;
    offsetX: number;
    offsetY: number;
  }>;
  minWidth: number;
  minHeight: number;
}

export const GUILDS: PlantGuild[] = [
  {
    id: "three-sisters",
    nameKey: "guilds.threeSisters.name",
    descriptionKey: "guilds.threeSisters.desc",
    icon: "\ud83c\udf3d",
    minWidth: 3,
    minHeight: 3,
    plants: [
      { plantId: "corn", offsetX: 1, offsetY: 1 },
      { plantId: "bean", offsetX: 0, offsetY: 0 },
      { plantId: "bean", offsetX: 2, offsetY: 0 },
      { plantId: "bean", offsetX: 0, offsetY: 2 },
      { plantId: "bean", offsetX: 2, offsetY: 2 },
      { plantId: "pumpkin", offsetX: 1, offsetY: 0 },
      { plantId: "pumpkin", offsetX: 0, offsetY: 1 },
      { plantId: "pumpkin", offsetX: 2, offsetY: 1 },
      { plantId: "pumpkin", offsetX: 1, offsetY: 2 },
    ],
  },
  {
    id: "tomato-basil",
    nameKey: "guilds.tomatoBasil.name",
    descriptionKey: "guilds.tomatoBasil.desc",
    icon: "\ud83c\udf45",
    minWidth: 3,
    minHeight: 2,
    plants: [
      { plantId: "tomato", offsetX: 0, offsetY: 0 },
      { plantId: "tomato", offsetX: 2, offsetY: 0 },
      { plantId: "basil", offsetX: 1, offsetY: 0 },
      { plantId: "carrot", offsetX: 0, offsetY: 1 },
      { plantId: "basil", offsetX: 1, offsetY: 1 },
      { plantId: "parsley", offsetX: 2, offsetY: 1 },
    ],
  },
  {
    id: "salad-bed",
    nameKey: "guilds.saladBed.name",
    descriptionKey: "guilds.saladBed.desc",
    icon: "\ud83e\udd6c",
    minWidth: 4,
    minHeight: 2,
    plants: [
      { plantId: "lettuce", offsetX: 0, offsetY: 0 },
      { plantId: "radish", offsetX: 1, offsetY: 0 },
      { plantId: "lettuce", offsetX: 2, offsetY: 0 },
      { plantId: "chives", offsetX: 3, offsetY: 0 },
      { plantId: "spinach", offsetX: 0, offsetY: 1 },
      { plantId: "carrot", offsetX: 1, offsetY: 1 },
      { plantId: "beetroot", offsetX: 2, offsetY: 1 },
      { plantId: "dill", offsetX: 3, offsetY: 1 },
    ],
  },
  {
    id: "mediterranean",
    nameKey: "guilds.mediterranean.name",
    descriptionKey: "guilds.mediterranean.desc",
    icon: "\u2600\ufe0f",
    minWidth: 3,
    minHeight: 2,
    plants: [
      { plantId: "tomato", offsetX: 0, offsetY: 0 },
      { plantId: "pepper", offsetX: 1, offsetY: 0 },
      { plantId: "zucchini", offsetX: 2, offsetY: 0 },
      { plantId: "basil", offsetX: 0, offsetY: 1 },
      { plantId: "rosemary", offsetX: 1, offsetY: 1 },
      { plantId: "thyme", offsetX: 2, offsetY: 1 },
    ],
  },
  {
    id: "root-vegetables",
    nameKey: "guilds.rootVegetables.name",
    descriptionKey: "guilds.rootVegetables.desc",
    icon: "\ud83e\udd55",
    minWidth: 4,
    minHeight: 2,
    plants: [
      { plantId: "carrot", offsetX: 0, offsetY: 0 },
      { plantId: "onion", offsetX: 1, offsetY: 0 },
      { plantId: "beetroot", offsetX: 2, offsetY: 0 },
      { plantId: "turnip", offsetX: 3, offsetY: 0 },
      { plantId: "leek", offsetX: 0, offsetY: 1 },
      { plantId: "garlic", offsetX: 1, offsetY: 1 },
      { plantId: "parsley", offsetX: 2, offsetY: 1 },
      { plantId: "dill", offsetX: 3, offsetY: 1 },
    ],
  },
  {
    id: "brassica-guild",
    nameKey: "guilds.brassica.name",
    descriptionKey: "guilds.brassica.desc",
    icon: "\ud83e\udd66",
    minWidth: 3,
    minHeight: 3,
    plants: [
      { plantId: "broccoli", offsetX: 0, offsetY: 0 },
      { plantId: "cabbage", offsetX: 2, offsetY: 0 },
      { plantId: "onion", offsetX: 1, offsetY: 0 },
      { plantId: "dill", offsetX: 0, offsetY: 1 },
      { plantId: "cauliflower", offsetX: 1, offsetY: 1 },
      { plantId: "dill", offsetX: 2, offsetY: 1 },
      { plantId: "kale", offsetX: 0, offsetY: 2 },
      { plantId: "beetroot", offsetX: 1, offsetY: 2 },
      { plantId: "kohlrabi", offsetX: 2, offsetY: 2 },
    ],
  },
];
