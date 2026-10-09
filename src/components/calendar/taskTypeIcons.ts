import type { LucideIcon } from "lucide-react";
import { House, Sprout, Shovel, Droplets, Apple, Leaf, Eye, CookingPot, TestTube, ClipboardList } from "lucide-react";
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
  soil_test: TestTube,
  custom: ClipboardList,
};
