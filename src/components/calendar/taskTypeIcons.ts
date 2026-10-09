import type { LucideIcon } from "lucide-react";
import { House, Sprout, Shovel, Droplets, Apple, Leaf, Eye, CookingPot, FlaskConical, ClipboardList } from "lucide-react";
import type { TaskType } from "@/types/task";

export const TASK_TYPE_ICONS: Record<TaskType, LucideIcon> = {
  sow_indoors: House,
  sow_outdoors: Sprout,
  transplant: Shovel,
  water: Droplets,
  harvest: Apple,
  fertilize: Leaf,
  // An eye, not a magnifier: in a row the magnifier reads as a search button.
  scout: Eye,
  preserve: CookingPot,
  // A flask (as on the soil page): the slim test tube reads as "!" at 16 px.
  soil_test: FlaskConical,
  custom: ClipboardList,
};
