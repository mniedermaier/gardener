import type { LucideIcon } from "lucide-react";
import { Apple, ClipboardList, BookOpen, Bug } from "lucide-react";
import type { Tone } from "@/components/ui/tone";

export interface QuickAction {
  /** Target page; it opens its add dialog via useOpenAddOnNavigate(). */
  to: string;
  icon: LucideIcon;
  labelKey: string;
  /** One line under the label in the quick-add sheet. */
  hintKey: string;
  tone: Tone;
}

/** The things people log while standing in the garden. Shared by QuickAdd and the command palette. */
export const QUICK_ACTIONS: QuickAction[] = [
  { to: "/harvest", icon: Apple, labelKey: "quickAdd.harvest", hintKey: "quickAdd.harvestHint", tone: "brand" },
  { to: "/tasks", icon: ClipboardList, labelKey: "quickAdd.task", hintKey: "quickAdd.taskHint", tone: "info" },
  { to: "/journal", icon: BookOpen, labelKey: "quickAdd.journal", hintKey: "quickAdd.journalHint", tone: "neutral" },
  { to: "/pests", icon: Bug, labelKey: "quickAdd.pest", hintKey: "quickAdd.pestHint", tone: "warning" },
];
