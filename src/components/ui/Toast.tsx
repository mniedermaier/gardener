import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { X, CheckCircle, AlertTriangle, Info } from "lucide-react";

export type ToastType = "success" | "warning" | "error" | "info";

export interface ToastOptions {
  /** Inline action, typically "Rückgängig": toast(msg, "success", { action: { label: t("common.undo"), onClick: restore } }) */
  action?: { label: string; onClick: () => void };
  /** ms until the toast disappears. Default 3000, with an action 6000. */
  duration?: number;
}

export interface ConfirmOptions {
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

interface ToastContextValue {
  toast: (message: string, type?: ToastType, options?: ToastOptions) => void;
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  confirm: () => Promise.resolve(false),
});

export function useToast() {
  return useContext(ToastContext);
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
    message: string;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = "success", options: ToastOptions = {}) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type, action: options.action }]);
    const duration = options.duration ?? (options.action ? 6000 : 3000);
    timers.current.set(id, setTimeout(() => dismiss(id), duration));
  }, [dismiss]);

  const confirmFn = useCallback((message: string, options: ConfirmOptions = {}): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ message, options, resolve });
    });
  }, []);

  const handleConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  const danger = confirmState?.options.danger ?? true;

  return (
    <ToastContext.Provider value={{ toast: addToast, confirm: confirmFn }}>
      {children}

      {/* Toast stack — above the bottom nav on mobile, bottom right on desktop */}
      <div className="pointer-events-none fixed inset-x-4 bottom-safe-nav z-[60] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              role={t.type === "error" ? "alert" : "status"}
              className="pointer-events-auto flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-lg dark:border-white/10 dark:bg-gray-800 dark:text-gray-100"
            >
              <Icon size={18} aria-hidden="true" className={`shrink-0 ${ICON_TONE[t.type]}`} />
              <span className="flex-1">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                  className="-my-1 min-h-9 shrink-0 rounded-lg px-2 font-semibold text-garden-700 hover:bg-garden-50 dark:text-garden-300 dark:hover:bg-white/10"
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                aria-label={translate("common.close")}
                onClick={() => dismiss(t.id)}
                className="-mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => handleConfirm(false)} />
          <div role="alertdialog" aria-modal="true" aria-label={confirmState.message} className="relative mx-4 w-full max-w-sm rounded-xl border border-transparent bg-white p-6 shadow-xl dark:border-white/10 dark:bg-gray-900">
            <p className="mb-5 text-sm text-gray-800 dark:text-gray-200">{confirmState.message}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleConfirm(false)}
                className="min-h-10 rounded-lg px-4 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
              >
                {translate("common.cancel")}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => handleConfirm(true)}
                className={`min-h-10 rounded-lg px-4 text-sm font-medium ${danger ? "bg-danger text-white hover:brightness-110 dark:text-gray-950" : "bg-garden-600 text-white hover:bg-garden-700"}`}
              >
                {confirmState.options.confirmLabel ?? translate("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
