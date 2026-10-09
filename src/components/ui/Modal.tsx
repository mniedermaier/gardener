import { useState, type ReactNode, useEffect, useId, useRef } from "react";
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
  /** "alertdialog" for confirmations that interrupt the user. Default "dialog". */
  role?: "dialog" | "alertdialog";
}

/**
 * After a failed save: move focus to the first field marked aria-invalid in
 * the open dialog, once React has rendered the error state.
 */
export function focusFirstInvalid(): void {
  requestAnimationFrame(() => {
    const field = document.querySelector<HTMLElement>("dialog[open] [aria-invalid='true']");
    field?.focus();
  });
}

const FIELD_SELECTOR = [
  "input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([disabled]):not([readonly])",
  "select:not([disabled])",
  "textarea:not([disabled]):not([readonly])",
].join(",");

/**
 * Where focus goes when a dialog opens — never the × button (showModal's default):
 * 1. an explicit marker `[data-autofocus]` ("Abbrechen" in a confirmation);
 * 2. with a mouse/trackpad, a field marked `[data-autofocus-field]`, else the first empty form field (a prefilled dialog
 *    continues where input is still missing), else the first field that is
 *    not a combobox (focus would open its list) — React's autoFocus fires
 *    before the dialog is open and is lost;
 * 3. otherwise the title, so screen readers start at the top and a phone does
 *    not pop up its keyboard over the sheet.
 */
function initialFocus(dialog: HTMLDialogElement): HTMLElement | null {
  const marked = dialog.querySelector<HTMLElement>("[data-autofocus]");
  if (marked) return marked;
  const fine = typeof window.matchMedia === "function" && window.matchMedia("(pointer: fine)").matches;
  if (fine) {
    // A dialog may name its main field (the observation, not an optional title before it).
    const preferred = dialog.querySelector<HTMLElement>("[data-autofocus-field]");
    if (preferred && preferred.getClientRects().length > 0) return preferred;
    const fields = [...dialog.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(FIELD_SELECTOR)].filter((el) => el.getClientRects().length > 0);
    const field = fields.find((el) => el.value === "") ?? fields.find((el) => el.getAttribute("role") !== "combobox");
    if (field) return field;
  }
  return dialog.querySelector<HTMLElement>("[data-dialog-title]");
}

/**
 * Built on <dialog>, which supplies the focus trap, Esc-to-close and focus
 * restoration that a div-based dialog has to reimplement by hand.
 */
export function Modal({ open, onClose, title, children, description, footer, size = "md", role }: ModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      initialFocus(dialog)?.focus();
      document.body.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // A long sheet scrolls under its sticky footer: while more lies below, the
  // footer casts a shadow upwards, so the dialog does not look finished early.
  const [moreBelow, setMoreBelow] = useState(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    const measure = () => setMoreBelow(dialog.scrollHeight - dialog.scrollTop - dialog.clientHeight > 8);
    const frame = requestAnimationFrame(measure);
    dialog.addEventListener("scroll", measure, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(dialog);
    // Content that grows (a revealed field) changes the scroll height, not the dialog box.
    for (const child of Array.from(dialog.children)) ro?.observe(child);
    return () => {
      cancelAnimationFrame(frame);
      dialog.removeEventListener("scroll", measure);
      ro?.disconnect();
    };
  }, [open]);

  // Esc and the backdrop both go through the dialog's own close event.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    // A click on the backdrop targets the <dialog> itself. Its own padding does
    // too, so only close when the pointer is outside the dialog box.
    const handleClick = (e: MouseEvent) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) dialog.close();
    };
    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("click", handleClick);
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("click", handleClick);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      role={role === "alertdialog" ? "alertdialog" : undefined}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      className={`m-0 max-h-[90dvh] w-full max-w-none translate-y-0 self-end overflow-y-auto rounded-t-xl bg-white p-4 pb-sheet text-gray-900 backdrop:bg-black/50 sm:m-auto ${size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg"} sm:self-center sm:rounded-xl sm:p-6 dark:bg-gray-900 dark:text-gray-100 dark:ring-1 dark:ring-white/10`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={titleId} data-dialog-title tabIndex={-1} className="text-lg font-semibold focus:outline-none">{title}</h2>
          {description && <p id={descId} className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.closeDialog")}
          className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 sm:size-9 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      {children}
      {footer && (
        <div className={`sticky -bottom-4 -mx-4 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-white px-4 pt-4 pb-1 transition-shadow sm:-bottom-6 sm:-mx-6 sm:px-6 dark:border-white/10 dark:bg-gray-900 ${moreBelow ? "shadow-[0_-8px_12px_-8px_rgb(0_0_0/0.15)] dark:shadow-[0_-8px_12px_-8px_rgb(0_0_0/0.6)]" : ""}`}>
          {footer}
        </div>
      )}
    </dialog>
  );
}
