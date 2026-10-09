import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Search, X } from "lucide-react";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { CONTROL_CLASS, LABEL_CLASS } from "@/components/ui/Field";
import { usePlantName } from "@/hooks/usePlantName";
import type { Plant } from "@/types/plant";
import type { BedInfo } from "./useBeds";

export interface PlantChoice {
  plantId: string;
  /** Set when the user picked a "plant in bed" option. */
  bedId?: string;
}

interface Option {
  key: string;
  plantId: string;
  bedId?: string;
  name: string;
  meta?: string;
  group: "planted" | "all";
}

interface PlantComboboxProps {
  label: string;
  plants: Plant[];
  /** Beds; plants growing in them are offered first, once per bed. */
  beds?: BedInfo[];
  value: string;
  bedId?: string;
  onChange: (choice: PlantChoice) => void;
  /** Shows a clear button and allows an empty value. */
  optional?: boolean;
  hint?: string;
  autoFocus?: boolean;
  /** Marks the field invalid (aria-invalid) so a failed save can focus it. */
  invalid?: boolean;
}

/**
 * "Was?" — one search field for the plant. Plants growing in the garden come
 * first, each with its bed, so picking "Tomate · Gewächshaus" fills plant and
 * bed in one go. Typing filters by plant or bed name. WAI-ARIA combobox with
 * an inline listbox (no popover clipping inside dialogs and bottom sheets).
 */
export function PlantCombobox({ label, plants, beds = [], value, bedId, onChange, optional, hint, autoFocus, invalid }: PlantComboboxProps) {
  const { t } = useTranslation();
  const getPlantName = usePlantName();
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const allowed = useMemo(() => new Set(plants.map((p) => p.id)), [plants]);
  const plantMap = useMemo(() => new Map(plants.map((p) => [p.id, p])), [plants]);

  const options = useMemo<Option[]>(() => {
    const planted: Option[] = [];
    const plantedIds = new Set<string>();
    for (const b of beds) {
      for (const pid of b.plantIds) {
        if (!allowed.has(pid)) continue;
        plantedIds.add(pid);
        planted.push({ key: `${pid}@${b.id}`, plantId: pid, bedId: b.id, name: getPlantName(pid), meta: b.label, group: "planted" });
      }
    }
    planted.sort((a, b) => a.name.localeCompare(b.name) || (a.meta ?? "").localeCompare(b.meta ?? ""));
    const rest: Option[] = plants
      .filter((p) => !plantedIds.has(p.id))
      .map((p) => ({ key: p.id, plantId: p.id, name: getPlantName(p.id), group: "all" as const }))
      .sort((a, b) => a.name.localeCompare(b.name));
    // A planted plant stays findable without a bed, at the end of the list.
    const plantedNoBed: Option[] = [...plantedIds]
      .map((pid) => ({ key: pid, plantId: pid, name: getPlantName(pid), group: "all" as const }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...planted, ...[...rest, ...plantedNoBed].sort((a, b) => a.name.localeCompare(b.name))];
  }, [beds, plants, allowed, getPlantName]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLocaleLowerCase().includes(q) || o.meta?.toLocaleLowerCase().includes(q));
  }, [options, query]);

  const selectedName = value ? getPlantName(value) : "";
  const display = open ? query : selectedName;

  const choose = (o: Option) => {
    onChange({ plantId: o.plantId, bedId: o.bedId });
    setOpen(false);
    setQuery("");
  };

  const openList = () => {
    setOpen(true);
    setQuery("");
    const idx = options.findIndex((o) => o.plantId === value && (o.bedId ?? "") === (bedId ?? ""));
    setActive(Math.max(0, idx));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { openList(); return; }
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (filtered.length ? (a + delta + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      const o = filtered[active];
      if (o) choose(o);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation(); // keep the surrounding dialog open
      setOpen(false);
    }
  };

  const selectedPlant = value ? plantMap.get(value) : undefined;
  const activeId = open && filtered[active] ? `${id}-opt-${active}` : undefined;
  let lastGroup: Option["group"] | null = null;

  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-gray-500" aria-hidden="true">
          {selectedPlant && !open ? <PlantIconDisplay plantId={selectedPlant.id} emoji={selectedPlant.icon} size={20} /> : <Search size={16} />}
        </span>
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-invalid={invalid || undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={t("records.plantSearch")}
          value={display}
          onFocus={openList}
          onClick={() => !open && openList()}
          onBlur={() => setOpen(false)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
          onKeyDown={onKeyDown}
          className={`${CONTROL_CLASS} pl-10 pr-10`}
        />
        <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {optional && value && !open ? (
            <button
              type="button"
              aria-label={t("records.clearPlant")}
              onClick={() => onChange({ plantId: "" })}
              className="inline-flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : (
            <ChevronDown size={16} aria-hidden="true" className="mr-1 text-gray-500 dark:text-gray-400" />
          )}
        </span>
      </div>
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      <div
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!open}
        className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-xs dark:border-white/10 dark:bg-gray-800"
      >
        {filtered.length === 0 && <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{t("common.noResults")}</div>}
        {filtered.map((o, i) => {
          const header = o.group !== lastGroup && beds.length > 0 && options.some((x) => x.group === "planted")
            ? (o.group === "planted" ? t("records.plantedNow") : t("records.allPlants"))
            : null;
          lastGroup = o.group;
          const plant = plantMap.get(o.plantId);
          const selected = o.plantId === value && (o.bedId ?? "") === (bedId ?? "");
          return [
            header && (
              <div key={`h-${o.group}`} role="presentation" className="px-3 pt-2 pb-1 text-overline font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                {header}
              </div>
            ),
            <div
              key={o.key}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={selected}
              tabIndex={-1}
              onKeyDown={(e) => { if (e.key === "Enter") choose(o); }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 text-sm sm:min-h-9 ${
                i === active ? "bg-gray-100 dark:bg-white/10" : ""
              } ${selected ? "font-medium text-garden-700 dark:text-garden-300" : "text-gray-800 dark:text-gray-100"}`}
            >
              {plant && <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={20} />}
              <span className="min-w-0 flex-1 truncate">{o.name}</span>
              {o.meta && <span className="shrink-0 truncate text-xs text-gray-500 dark:text-gray-400">{o.meta}</span>}
            </div>,
          ];
        })}
      </div>
    </div>
  );
}
