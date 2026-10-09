import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Search, CornerDownLeft, Download, Moon, Sun, LayoutGrid, Apple, Bird, BookOpen, ClipboardList, FileText } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { applyTheme } from "@/lib/theme";
import { exportAllData } from "@/lib/dataExport";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { useToast } from "@/components/ui/Toast";
import { TONE_SOFT } from "@/components/ui/tone";
import type { OpenAddState } from "@/hooks/useOpenAddOnNavigate";
import { ALL_NAV_ENTRIES, SECTIONS } from "./navigation";
import { QUICK_ACTIONS } from "./quickActions";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

type GroupKey = "actions" | "pages" | "plants" | "beds" | "animals" | "tasks" | "journal";

interface Command {
  id: string;
  group: GroupKey;
  label: string;
  /** Right-aligned context ("Kalender", "Hochbeet Süd"). */
  hint?: string;
  /** Extra words that should match but are not shown (old page names, synonyms). */
  keywords?: string;
  icon?: LucideIcon;
  leading?: ReactNode;
  run: () => void;
}

const GROUP_ORDER: GroupKey[] = ["actions", "pages", "plants", "beds", "animals", "tasks", "journal"];

// "Gemüse" matches "gemuse", "Tomate" matches "tomaten".
const normalize = (s: string) => s.toLocaleLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Legacy long page names stay searchable after the navigation was shortened.
const LEGACY_LABELS: Record<string, string> = {
  today: "nav.dashboard", planner: "nav.planner", plants: "nav.plants", harvest: "nav.harvest",
  pantry: "nav.pantry", livestock: "nav.livestock", expenses: "nav.expenses", water: "nav.waterLog",
};

/**
 * Ctrl+K / ⌘K: jump to any page or tab, run a quick action, or open a plant,
 * bed, animal, task or journal entry directly.
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatDate } = useFormat();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(0);

  const { gardens, animals, tasks, journalEntries, theme, setTheme, setActiveGarden } = useStore(
    useShallow((s) => ({
      gardens: s.gardens, animals: s.animals, tasks: s.tasks, journalEntries: s.journalEntries,
      theme: s.theme, setTheme: s.setTheme, setActiveGarden: s.setActiveGarden,
    })),
  );
  const plants = usePlants();
  const getPlantName = usePlantName();
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Where focus goes back to after Esc or a click outside. Opened with Ctrl+K
  // from nowhere (focus on <body>), that is the visible search button in the
  // top bar. Choosing an item navigates instead and leaves focus to the page.
  const returnFocus = useRef<HTMLElement | null>(null);

  // Open/close the native dialog; reset the query each time it opens.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const prev = document.activeElement;
      returnFocus.current = prev instanceof HTMLElement && prev !== document.body ? prev : null;
      dialog.showModal();
      inputRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    let dismissed = false;
    const handleCancel = () => { dismissed = true; };
    const handleClose = () => {
      setQuery("");
      setDebounced("");
      setActive(0);
      onClose();
      if (dismissed) {
        const fallback = [...document.querySelectorAll<HTMLElement>("[data-palette-trigger]")].find((el) => el.offsetParent !== null);
        (returnFocus.current?.isConnected ? returnFocus.current : fallback)?.focus();
      }
      dismissed = false;
    };
    // A click on the backdrop lands on the <dialog> itself and closes it.
    const handleBackdrop = (e: MouseEvent) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
        dismissed = true;
        onClose();
      }
    };
    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("click", handleBackdrop);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("click", handleBackdrop);
    };
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Closing goes through the parent; the effect above then closes the dialog.
  const close = onClose;
  const go = useCallback((to: string, state?: OpenAddState) => {
    close();
    navigate(to, state ? { state } : undefined);
  }, [close, navigate]);

  // Pages and actions: cheap, filtered on every keystroke.
  const staticCommands = useMemo<Command[]>(() => {
    const pages: Command[] = [];
    for (const entry of ALL_NAV_ENTRIES) {
      const legacy = LEGACY_LABELS[entry.id];
      pages.push({
        id: `page:${entry.to}`, group: "pages", label: t(entry.labelKey), icon: entry.icon,
        keywords: legacy ? t(legacy) : undefined, run: () => go(entry.to),
      });
      for (const tab of (SECTIONS[entry.id] ?? []).slice(1)) {
        pages.push({
          id: `page:${tab.to}`, group: "pages", label: t(tab.labelKey), hint: t(entry.labelKey), icon: entry.icon,
          run: () => go(tab.to),
        });
      }
    }
    const dark = isDark;
    const actions: Command[] = [
      ...QUICK_ACTIONS.map((a) => ({
        id: `action:${a.to}`, group: "actions" as const, label: t(a.labelKey), icon: a.icon,
        run: () => go(a.to, { openAdd: true }),
      })),
      {
        id: "action:backup", group: "actions", label: t("shell.command.backup"), icon: Download,
        keywords: "export json", run: () => { close(); exportAllData(); toast(t("dataManagement.exportSuccess"), "success"); },
      },
      {
        id: "action:theme", group: "actions", label: t(dark ? "shell.command.lightMode" : "shell.command.darkMode"),
        icon: dark ? Sun : Moon, keywords: `${t("settings.theme")} theme`,
        run: () => {
          const next = dark ? "light" : "dark";
          setTheme(next);
          applyTheme(next);
          close();
        },
      },
    ];
    return [...actions, ...pages];
  }, [t, isDark, go, close, toast, setTheme]);

  // Objects: debounced, capped per group.
  const objectCommands = useMemo<Command[]>(() => {
    const q = normalize(debounced.trim());
    if (q.length < 2) return [];
    const out: Command[] = [];
    const cap = (group: GroupKey) => out.filter((c) => c.group === group).length < 5;

    for (const p of plants) {
      if (!cap("plants")) break;
      const name = getPlantName(p.id);
      if (normalize(name).includes(q)) {
        out.push({
          id: `plant:${p.id}`, group: "plants", label: name, hint: t(`plants.category.${p.category}`),
          leading: <PlantIconDisplay plantId={p.id} emoji={p.icon} size={20} />,
          run: () => go(`/plants?plant=${encodeURIComponent(p.id)}`),
        });
        // The two best plant hits also offer "log a harvest" and the beds they grow in.
        if (out.filter((c) => c.id.startsWith("plant:")).length <= 2) {
          out.push({
            id: `harvest:${p.id}`, group: "plants", label: t("shell.command.logHarvestFor", { name }), icon: Apple,
            run: () => go(`/harvest?plant=${encodeURIComponent(p.id)}`),
          });
          for (const g of gardens) {
            for (const b of g.beds) {
              const count = b.cells.filter((c) => c.plantId === p.id).length;
              if (!count || !cap("beds")) continue;
              out.push({
                id: `bedplant:${b.id}:${p.id}`, group: "beds", label: t("shell.command.plantInBed", { plant: name, bed: b.name }),
                hint: t("shell.command.cellCount", { count }), icon: LayoutGrid,
                run: () => { setActiveGarden(g.id); go(`/planner?bed=${encodeURIComponent(b.id)}`); },
              });
            }
          }
        }
      }
    }
    for (const g of gardens) {
      for (const b of g.beds) {
        if (!cap("beds")) break;
        if (normalize(b.name).includes(q)) {
          out.push({
            id: `bed:${b.id}`, group: "beds", label: b.name, hint: g.name, icon: LayoutGrid,
            run: () => { setActiveGarden(g.id); go(`/planner?bed=${encodeURIComponent(b.id)}`); },
          });
        }
      }
    }
    for (const a of animals) {
      if (!cap("animals")) break;
      const name = a.name || t(`livestock.types.${a.type}`);
      if (normalize(name).includes(q) || normalize(t(`livestock.types.${a.type}`)).includes(q)) {
        out.push({ id: `animal:${a.id}`, group: "animals", label: name, hint: t(`livestock.types.${a.type}`), icon: Bird, run: () => go(`/livestock/${a.id}`) });
      }
    }
    for (const task of tasks) {
      if (!cap("tasks")) break;
      if (!task.completedDate && normalize(task.title).includes(q)) {
        out.push({ id: `task:${task.id}`, group: "tasks", label: task.title, hint: formatDate(task.dueDate, "relative"), icon: ClipboardList, run: () => go(`/tasks?task=${encodeURIComponent(task.id)}`) });
      }
    }
    for (const j of journalEntries) {
      if (!cap("journal")) break;
      if (normalize(j.title).includes(q) || normalize(j.text).includes(q)) {
        out.push({ id: `journal:${j.id}`, group: "journal", label: j.title || formatDate(j.date, "long"), hint: formatDate(j.date, "short"), icon: BookOpen, run: () => go(`/journal?entry=${encodeURIComponent(j.id)}`) });
      }
    }
    return out;
  }, [go, debounced, plants, gardens, animals, tasks, journalEntries, getPlantName, t, formatDate, setActiveGarden]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const matches = (c: Command) => !q || normalize(`${c.label} ${c.hint ?? ""} ${c.keywords ?? ""}`).includes(q);
    // Empty query: actions plus the main pages as a starting point.
    const base = q ? staticCommands.filter(matches) : staticCommands.filter((c) => c.group === "actions" || (c.group === "pages" && !c.hint));
    const all = [...base, ...objectCommands];
    return GROUP_ORDER.flatMap((g) => all.filter((c) => c.group === g));
  }, [query, staticCommands, objectCommands]);

  const activeIndex = Math.min(active, Math.max(0, results.length - 1));
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((activeIndex + 1) % Math.max(1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((activeIndex - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[activeIndex]?.run();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={t("shell.command.title")}
      className="m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-white p-0 text-gray-900 backdrop:bg-gray-950/50 sm:bottom-auto sm:mx-auto sm:mt-[12vh] sm:h-auto sm:max-h-[70vh] sm:max-w-xl sm:rounded-xl sm:shadow-lg dark:bg-gray-900 dark:text-gray-100 dark:ring-1 dark:ring-white/10"
    >
      <div className="flex h-full max-h-[inherit] flex-col pt-safe sm:pt-0">
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 dark:border-white/10">
          <Search size={18} aria-hidden="true" className="shrink-0 text-gray-500 dark:text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${baseId}-list`}
            aria-activedescendant={results.length ? optionId(activeIndex) : undefined}
            aria-autocomplete="list"
            aria-label={t("shell.command.title")}
            placeholder={t("shell.command.placeholder")}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            className="min-h-14 flex-1 bg-transparent text-base outline-none placeholder:text-gray-500 focus-visible:outline-none dark:placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={close}
            className="min-h-11 shrink-0 rounded-lg px-2 text-sm font-medium text-gray-600 hover:bg-gray-100 sm:hidden dark:text-gray-300 dark:hover:bg-white/10"
          >
            {t("common.cancel")}
          </button>
          <kbd className="hidden shrink-0 rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-500 sm:inline dark:border-white/15 dark:text-gray-400">Esc</kbd>
        </div>

        <div ref={listRef} id={`${baseId}-list`} role="listbox" aria-label={t("shell.command.results")} className="min-h-0 flex-1 overflow-y-auto p-2 sm:flex-initial">
          {results.length === 0 && (
            <p className="px-3 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              {query.trim().length >= 2 && query !== debounced ? t("common.loading") : t("search.noResults")}
            </p>
          )}
          {results.map((c, i) => {
            const header = i === 0 || results[i - 1].group !== c.group ? c.group : null;
            const Icon = c.icon ?? FileText;
            const selected = i === activeIndex;
            return (
              <div key={c.id}>
                {header && (
                  <div role="presentation" className="px-3 pt-3 pb-1 text-overline font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                    {t(`shell.command.groups.${header}`)}
                  </div>
                )}
                <div
                  id={optionId(i)}
                  role="option"
                  aria-selected={selected}
                  data-index={i}
                  tabIndex={-1}
                  onMouseMove={() => { if (!selected) setActive(i); }}
                  onClick={() => c.run()}
                  onKeyDown={(e) => { if (e.key === "Enter") c.run(); }}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${selected ? "bg-gray-100 dark:bg-white/10" : ""}`}
                >
                  <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg ${c.leading ? "" : c.group === "actions" ? TONE_SOFT.brand : TONE_SOFT.neutral}`} aria-hidden="true">
                    {c.leading ?? <Icon size={16} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{c.label}</span>
                  {c.hint && <span className="shrink-0 truncate text-xs text-gray-500 dark:text-gray-400">{c.hint}</span>}
                  {selected && <CornerDownLeft size={14} aria-hidden="true" className="hidden shrink-0 text-gray-500 sm:block" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden items-center gap-4 border-t border-gray-200 px-4 py-2 text-xs text-gray-500 sm:flex dark:border-white/10 dark:text-gray-400">
          <span><kbd className="font-sans">↑↓</kbd> {t("shell.command.navigate")}</span>
          <span><kbd className="font-sans">↵</kbd> {t("shell.command.open")}</span>
        </div>
      </div>
    </dialog>
  );
}
