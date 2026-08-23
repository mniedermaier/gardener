import { type ReactNode, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Built on <dialog>, which supplies the focus trap, Esc-to-close and focus
 * restoration that a div-based dialog has to reimplement by hand.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
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
      className="m-0 max-h-[90vh] w-full max-w-none translate-y-0 self-end overflow-y-auto rounded-t-xl bg-white p-4 text-gray-900 backdrop:bg-black/50 sm:m-auto sm:max-w-lg sm:self-center sm:rounded-xl sm:p-6 dark:bg-gray-900 dark:text-gray-100"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
