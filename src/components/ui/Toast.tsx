import { createContext, useContext, useState, useCallback, useEffect, useRef, Suspense, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { X, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export type ToastType = "success" | "warning" | "error" | "info";

export interface ToastOptions {
  /** Inline action, typically "Rückgängig": toast(msg, "success", { action: { label: t("common.undo"), onClick: restore } }) */
  action?: { label: string; onClick: () => void };
  /** ms until the toast disappears. Default 3000, with an action 6000. */
  duration?: number;
}

export interface ConfirmOptions {
  /**
   * Dialog heading. Name the object: "„Tomate · 1,9 kg“ löschen?"
   * (common.confirmDeleteNamed). Without a title the message becomes the heading.
   */
  title?: string;
  /** Label of the confirming button. Default: common.confirm */
  confirmLabel?: string;
  /** Destructive confirmation (red button). Default true. */
  danger?: boolean;
}

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  action?: ToastOptions["action"];
}

/** Object form of confirm(): confirm({ title, message, confirmLabel, danger }). */
export interface ConfirmRequest extends ConfirmOptions {
  message?: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, options?: ToastOptions) => void;
  confirm: (message: string | ConfirmRequest, options?: ConfirmOptions) => Promise<boolean>;
}

/** Toasts kept at once; on phones only the newest is shown (see below). */
const MAX_TOASTS = 2;

/** Route part of the hash ("#/planner?bed=x" → "/planner"). */
const routeOf = () => window.location.hash.replace(/^#/, "").split("?")[0] || "/";

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  confirm: () => Promise.resolve(false),
});

export function useToast() {
  return useContext(ToastContext);
}

/** Object kinds with a named delete confirmation (common.deleteNamed.*). */
export type DeleteKind =
  | "harvest" | "journal" | "pest" | "seed" | "pantry" | "expense" | "water" | "task"
  | "soilTest" | "amendment" | "product" | "feed" | "health" | "animal" | "garden";

/**
 * Delete confirmation that names the object: "Ernte „Tomate · 1,9 kg“ löschen?".
 * The text defaults to the undo hint, since every delete offers "Rückgängig".
 */
export function useConfirmDelete() {
  const { confirm } = useToast();
  const { t } = useTranslation(undefined, { useSuspense: false });
  return useCallback(
    (kind: DeleteKind, name: string, message?: string) =>
      confirm({
        title: t(`common.deleteNamed.${kind}`, { name }),
        message: message ?? t("common.confirmDeleteUndo"),
        confirmLabel: t("common.delete"),
      }),
    [confirm, t],
  );
}

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertTriangle,
  info: Info,
};

const ICON_TONE = {
  success: "text-positive",
  warning: "text-warning",
  error: "text-danger",
  info: "text-info",
};

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  // Der Provider liegt außerhalb der Suspense-Grenze, deshalb darf
  // useTranslation hier nicht suspendieren.
  const { t: translate } = useTranslation(undefined, { useSuspense: false });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message?: string;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);
  // Keeps the text while the dialog closes, so it does not flash empty.
  const [lastConfirm, setLastConfirm] = useState(confirmState);

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = "success", options: ToastOptions = {}) => {
    const id = nextId++;
    setToasts((prev) => {
      const next = [...prev, { id, message, type, action: options.action }];
      // Never pile up: the oldest toasts make room for the new one.
      for (const old of next.slice(0, Math.max(0, next.length - MAX_TOASTS))) {
        clearTimeout(timers.current.get(old.id));
        timers.current.delete(old.id);
      }
      return next.slice(-MAX_TOASTS);
    });
    const duration = options.duration ?? (options.action ? 6000 : 3000);
    timers.current.set(id, setTimeout(() => dismiss(id), duration));
  }, [dismiss]);

  // A page change clears plain notices; toasts with a running undo action
  // may follow the user to the next page until their timer runs out.
  useEffect(() => {
    let route = routeOf();
    const onHashChange = () => {
      const next = routeOf();
      if (next === route) return;
      route = next;
      setToasts((prev) => {
        const keep = prev.filter((t) => t.action);
        for (const t of prev) if (!t.action) { clearTimeout(timers.current.get(t.id)); timers.current.delete(t.id); }
        return keep.length === prev.length ? prev : keep;
      });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const confirmFn = useCallback((request: string | ConfirmRequest, options: ConfirmOptions = {}): Promise<boolean> => {
    const { message, ...opts } = typeof request === "string" ? { ...options, message: request } : { ...request, ...options };
    const title = opts.title ?? message ?? "";
    return new Promise((resolve) => {
      const next = { title, message: opts.title ? message : undefined, options: opts, resolve };
      setConfirmState(next);
      setLastConfirm(next);
    });
  }, []);

  const handleConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  const shown = confirmState ?? lastConfirm;
  const danger = shown?.options.danger ?? true;

  return (
    <ToastContext.Provider value={{ toast: addToast, confirm: confirmFn }}>
      {children}

      {/* Toast stack — above the bottom nav on mobile, bottom right on desktop */}
      <div className="pointer-events-none fixed inset-x-4 bottom-safe-nav z-[60] mx-auto flex max-w-sm flex-col items-stretch gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:mx-0 sm:w-96 sm:max-w-none" aria-live="polite">
        {toasts.map((t, i) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              role={t.type === "error" ? "alert" : "status"}
              // Phones show only the newest toast, compact, so it does not cover the bed.
              className={`pointer-events-auto items-center gap-2 rounded-xl border border-gray-200 bg-white py-1.5 pr-1.5 pl-3 text-sm text-gray-900 shadow-lg sm:gap-3 sm:py-3 sm:pr-4 sm:pl-4 dark:border-white/10 dark:bg-gray-800 dark:text-gray-100 ${i < toasts.length - 1 ? "hidden sm:flex" : "flex"}`}
            >
              <Icon size={18} aria-hidden="true" className={`shrink-0 ${ICON_TONE[t.type]}`} />
              <span className="line-clamp-2 flex-1 sm:line-clamp-none">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                  className="-my-1 min-h-11 shrink-0 rounded-lg px-2 sm:min-h-9 font-semibold text-garden-700 hover:bg-garden-50 dark:text-garden-300 dark:hover:bg-white/10"
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                aria-label={translate("common.dismissNotice")}
                onClick={() => dismiss(t.id)}
                className="-mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-gray-500 sm:size-8 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm dialog: a <dialog> via Modal, so Esc cancels, focus stays
          trapped and returns to the trigger. Initial focus sits on "Abbrechen"
          so an accidental Enter never deletes. */}
      <Suspense fallback={null}>
        <Modal
          open={confirmState !== null}
          onClose={() => handleConfirm(false)}
          role="alertdialog"
          title={shown?.title ?? ""}
          description={shown?.message}
          footer={
            <>
              <Button variant="secondary" data-autofocus onClick={() => handleConfirm(false)}>
                {translate("common.cancel")}
              </Button>
              <Button variant={danger ? "danger" : "primary"} onClick={() => handleConfirm(true)}>
                {shown?.options.confirmLabel ?? translate("common.confirm")}
              </Button>
            </>
          }
        >
          {null}
        </Modal>
      </Suspense>
    </ToastContext.Provider>
  );
}
