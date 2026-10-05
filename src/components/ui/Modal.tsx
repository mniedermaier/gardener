import { type ReactNode, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Optional one-line explanation under the title. */
  description?: ReactNode;
  /**
   * Action row (Cancel / Save, delete left as `variant="danger-ghost"`).
   * Rendered sticky at the bottom so it stays reachable in long forms.
   */
  footer?: ReactNode;
  /** Width on desktop. Default "md" (32 rem). */
  size?: "md" | "lg";
}

/**
 * Built on <dialog>, which supplies the focus trap, Esc-to-close and focus
 * restoration that a div-based dialog has to reimplement by hand.
 */
export function Modal({ open, onClose, title, children, description, footer, size = "md" }: ModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Esc and the backdrop both go through the dialog's own close event.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClick={(e) => {
        // Clicks land on the dialog itself only when they hit the backdrop.
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
      className={`m-0 max-h-[90dvh] w-full max-w-none translate-y-0 self-end overflow-y-auto rounded-t-xl bg-white p-4 pb-sheet text-gray-900 backdrop:bg-black/50 sm:m-auto ${size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg"} sm:self-center sm:rounded-xl sm:p-6 dark:bg-gray-900 dark:text-gray-100 dark:ring-1 dark:ring-white/10`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 sm:size-9 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100"
        >
          <X size={20} />
        </button>
      </div>
      {children}
      {footer && (
        <div className="sticky -bottom-4 -mx-4 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-white px-4 pt-4 pb-1 sm:-bottom-6 sm:-mx-6 sm:px-6 dark:border-white/10 dark:bg-gray-900">
          {footer}
        </div>
      )}
    </dialog>
  );
}
