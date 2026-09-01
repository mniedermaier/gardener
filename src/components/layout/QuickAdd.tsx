import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Apple, ClipboardList, BookOpen } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { OpenAddState } from "@/hooks/useOpenAddOnNavigate";

const actions = [
  { to: "/harvest", icon: Apple, labelKey: "quickAdd.harvest", color: "bg-red-500" },
  { to: "/tasks", icon: ClipboardList, labelKey: "quickAdd.task", color: "bg-sky-500" },
  { to: "/journal", icon: BookOpen, labelKey: "quickAdd.journal", color: "bg-amber-500" },
] as const;

// The planner has its own bottom sheet; a floating button would sit on top of it.
const HIDDEN_ON = ["/planner"];

/**
 * Floating quick-add button for the three things people log while standing in
 * the garden: a harvest, a task, a journal entry. Mobile only — on desktop the
 * page headers already carry the add buttons.
 */
export function QuickAdd() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const go = (to: string) => {
    setOpen(false);
    navigate(to, { state: { openAdd: true } satisfies OpenAddState });
  };

  // On harvest/tasks/journal the button is that page's add button: one tap, no sheet.
  const ownAction = actions.find((a) => a.to === pathname);

  return (
    <>
      <button
        type="button"
        onClick={() => (ownAction ? go(ownAction.to) : setOpen(true))}
        aria-label={ownAction ? t(ownAction.labelKey) : t("quickAdd.title")}
        className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-garden-600 text-white shadow-lg transition-transform active:scale-95 bottom-safe-nav sm:hidden"
      >
        <Plus size={28} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("quickAdd.title")}>
        <div className="grid gap-2">
          {actions.map(({ to, icon: Icon, labelKey, color }) => (
            <button
              key={to}
              type="button"
              onClick={() => go(to)}
              className="flex min-h-14 items-center gap-3 rounded-xl border border-gray-200 px-4 text-left text-base font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-white ${color}`}>
                <Icon size={18} />
              </span>
              {t(labelKey)}
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
