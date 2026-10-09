import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { TONE_SOFT } from "@/components/ui/tone";
import type { OpenAddState } from "@/hooks/useOpenAddOnNavigate";
import { QUICK_ACTIONS } from "./quickActions";

// The planner has its own bottom sheet; a floating button would sit on top of it.
// Settings, the companion matrix and the import page have nothing to add.
const HIDDEN_ON = ["/planner", "/settings", "/companions", "/import"];

interface QuickAddProps {
  /** Hide while the navigation drawer is open: the button would float above it. */
  hidden?: boolean;
}

/**
 * Floating quick-add button for what people log while standing in the
 * garden: a harvest, a task, a journal entry, a pest sighting. Mobile only —
 * on desktop the page headers and the command palette (Ctrl+K) carry these.
 */
export function QuickAdd({ hidden = false }: QuickAddProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const go = (to: string) => {
    setOpen(false);
    navigate(to, { state: { openAdd: true } satisfies OpenAddState });
  };

  // On a page that has its own add dialog the button is that page's add button: one tap, no sheet.
  const ownAction = QUICK_ACTIONS.find((a) => a.to === pathname);

  return (
    <>
      {!hidden && (
        <button
          type="button"
          onClick={() => (ownAction ? go(ownAction.to) : setOpen(true))}
          aria-label={ownAction ? t(ownAction.labelKey) : t("quickAdd.title")}
          className="fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-garden-600 text-white shadow-lg transition-transform active:scale-95 bottom-safe-nav sm:hidden"
        >
          <Plus size={28} aria-hidden="true" />
        </button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={t("quickAdd.title")}>
        <ul className="-mx-1 grid gap-1">
          {QUICK_ACTIONS.map(({ to, icon: Icon, labelKey, hintKey, tone }) => (
            <li key={to}>
              <button
                type="button"
                onClick={() => go(to)}
                className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg ${TONE_SOFT[tone]}`} aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-medium text-gray-900 dark:text-gray-100">{t(labelKey)}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{t(hintKey)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
