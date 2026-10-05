import { memo, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, X, Search, Info, ChevronRight, Grid3x3, ListTree } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { List, ListRow } from "@/components/ui/List";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { usePlants } from "@/hooks/usePlants";
import type { Plant } from "@/types/plant";

type Relation = "good" | "bad" | null;
type View = "matrix" | "plant";

const MD_QUERY = "(min-width: 768px)";
function subscribeMd(cb: () => void) {
  const mq = window.matchMedia(MD_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getMd = () => window.matchMedia(MD_QUERY).matches;

/** Symmetric relation lookup: A lists B or B lists A. "good" wins on contradictory data. */
function useRelations(plants: Plant[]) {
  return useMemo(() => {
    const map = new Map<string, Relation>();
    const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    for (const p of plants) {
      for (const id of p.antagonists) if (id !== p.id) map.set(key(p.id, id), "bad");
    }
    for (const p of plants) {
      for (const id of p.companions) if (id !== p.id) map.set(key(p.id, id), "good");
    }
    return (a: string, b: string): Relation => (a === b ? null : map.get(key(a, b)) ?? null);
  }, [plants]);
}

function RelationMark({ relation, size = 14 }: { relation: Exclude<Relation, null>; size?: number }) {
  return relation === "good" ? (
    <span className="inline-flex size-6 items-center justify-center rounded-md bg-positive/15 text-positive">
      <Check size={size} strokeWidth={3} aria-hidden="true" />
    </span>
  ) : (
    <span className="inline-flex size-6 items-center justify-center rounded-md bg-danger/15 text-danger">
      <X size={size} strokeWidth={3} aria-hidden="true" />
    </span>
  );
}

function Legend() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
      <span className="inline-flex items-center gap-2"><RelationMark relation="good" />{t("companions.companionsLabel")}</span>
      <span className="inline-flex items-center gap-2"><RelationMark relation="bad" />{t("companions.antagonistsLabel")}</span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex size-6 items-center justify-center rounded-md border border-dashed border-gray-300 dark:border-white/20" aria-hidden="true" />
        {t("companions.legendNone")}
      </span>
    </div>
  );
}

// ------------------------------------------------------------------ matrix (desktop)

const MatrixRow = memo(function MatrixRow({
  plant, cols, names, relation, focusId, onFocus,
}: {
  plant: Plant;
  cols: Plant[];
  names: Map<string, string>;
  relation: (a: string, b: string) => Relation;
  focusId: string | null;
  onFocus: (id: string) => void;
}) {
  const { t } = useTranslation();
  const rowFocused = focusId === plant.id;
  const name = names.get(plant.id) ?? plant.id;
  return (
    <tr className="group/row">
      <th
        scope="row"
        className={`sticky left-0 z-10 border-r border-b border-gray-200 p-0 text-left font-normal dark:border-white/10 ${
          rowFocused ? "bg-garden-50 dark:bg-garden-900" : "bg-white dark:bg-gray-900"
        }`}
      >
        <button
          type="button"
          aria-pressed={rowFocused}
          onClick={() => onFocus(plant.id)}
          className={`flex h-9 w-full min-w-40 items-center gap-2 px-3 text-sm whitespace-nowrap hover:bg-gray-50 dark:hover:bg-white/5 ${
            rowFocused ? "font-semibold text-garden-800 dark:text-garden-200" : "text-gray-800 dark:text-gray-200"
          }`}
        >
          <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={18} />
          {name}
        </button>
      </th>
      {cols.map((col) => {
        const rel = relation(plant.id, col.id);
        const inFocus = focusId !== null && (rowFocused || focusId === col.id);
        const dim = focusId !== null && !inFocus;
        const label = rel
          ? t(rel === "good" ? "companions.relationGood" : "companions.relationBad", { a: name, b: names.get(col.id) ?? col.id })
          : undefined;
        return (
          <td
            key={col.id}
            title={label}
            className={`size-9 border-b border-gray-100 p-0 text-center align-middle dark:border-white/5 ${
              plant.id === col.id
                ? "bg-gray-100 dark:bg-white/10"
                : inFocus
                  ? "bg-garden-50/80 dark:bg-garden-500/10"
                  : ""
            }`}
          >
            {rel && (
              <span className={dim ? "opacity-25" : ""}>
                <RelationMark relation={rel} />
                <span className="sr-only">{label}</span>
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
});

function MatrixView({ plants, names, relation, focusId, onFocus }: {
  plants: Plant[];
  names: Map<string, string>;
  relation: (a: string, b: string) => Relation;
  focusId: string | null;
  onFocus: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Card padding="none" className="relative overflow-hidden">
      {/* Fade on the right edge: there are more columns to scroll to */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-40 w-8 bg-gradient-to-l from-white dark:from-gray-900" aria-hidden="true" />
      <div className="max-h-[calc(100dvh-17rem)] min-h-96 overflow-auto [scrollbar-gutter:stable]">
        <table className="border-separate border-spacing-0">
          <caption className="sr-only">{t("companions.title")}</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky top-0 left-0 z-30 border-r border-b border-gray-200 bg-white px-3 pb-2 text-left align-bottom text-xs font-medium text-gray-500 dark:border-white/10 dark:bg-gray-900 dark:text-gray-400">
                {t("companions.matrixHint")}
              </th>
              {plants.map((p) => {
                const focused = focusId === p.id;
                return (
                  <th
                    key={p.id}
                    scope="col"
                    className={`sticky top-0 z-20 border-b border-gray-200 p-0 align-bottom font-normal dark:border-white/10 ${
                      focused ? "bg-garden-50 dark:bg-garden-900" : "bg-white dark:bg-gray-900"
                    }`}
                  >
                    <button
                      type="button"
                      aria-pressed={focused}
                      onClick={() => onFocus(p.id)}
                      className={`flex w-9 flex-col items-center gap-1.5 px-0 pt-2 pb-2 hover:bg-gray-50 dark:hover:bg-white/5 ${
                        focused ? "font-semibold text-garden-800 dark:text-garden-200" : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <span className="max-h-32 rotate-180 truncate text-xs whitespace-nowrap [writing-mode:vertical-rl]">
                        {names.get(p.id)}
                      </span>
                      <PlantIconDisplay plantId={p.id} emoji={p.icon} size={18} />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {plants.map((p) => (
              <MatrixRow key={p.id} plant={p} cols={plants} names={names} relation={relation} focusId={focusId} onFocus={onFocus} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ partner finder (mobile + desktop alt view)

function PartnerFinder({ plants, names, relation, selectedId, onSelect }: {
  plants: Plant[];
  names: Map<string, string>;
  relation: (a: string, b: string) => Relation;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const selected = plants.find((p) => p.id === selectedId) ?? plants[0];

  const { good, bad } = useMemo(() => {
    const g: Plant[] = [];
    const b: Plant[] = [];
    if (selected) {
      for (const p of plants) {
        const rel = relation(selected.id, p.id);
        if (rel === "good") g.push(p);
        else if (rel === "bad") b.push(p);
      }
    }
    return { good: g, bad: b };
  }, [plants, relation, selected]);

  if (!selected) return null;

  const group = (items: Plant[], kind: "good" | "bad") => (
    <List
      header={
        <span className="inline-flex items-center gap-2">
          <RelationMark relation={kind} size={12} />
          {t(kind === "good" ? "companions.goodCount" : "companions.badCount", { count: items.length })}
        </span>
      }
    >
      {items.length === 0 ? (
        <li className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{t("companions.noneKnown")}</li>
      ) : (
        items.map((p) => (
          <ListRow
            key={p.id}
            leading={<PlantIconDisplay plantId={p.id} emoji={p.icon} size={26} />}
            title={names.get(p.id)}
            meta={t(`plants.category.${p.category}`)}
            onClick={() => onSelect(p.id)}
          />
        ))
      )}
    </List>
  );

  return (
    <div className="space-y-4">
      <Card padding="sm">
        <Select
          label={t("companions.choosePlant")}
          value={selected.id}
          onChange={(e) => onSelect(e.target.value)}
          options={plants.map((p) => ({ value: p.id, label: names.get(p.id) ?? p.id }))}
        />
        <div className="mt-4 flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10" aria-hidden="true">
            <PlantIconDisplay plantId={selected.id} emoji={selected.icon} size={30} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{names.get(selected.id)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("companions.goodCount", { count: good.length })} · {t("companions.badCount", { count: bad.length })}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/plants?plant=${encodeURIComponent(selected.id)}`)}>
            {t("companions.openDetails")}
            <ChevronRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {group(good, "good")}
        {group(bad, "bad")}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ page

export function CompanionMatrix() {
  const { t } = useTranslation();
  const allPlants = usePlants();
  const isDesktop = useSyncExternalStore(subscribeMd, getMd, () => true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<View>("matrix");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setSearch(query.trim().toLowerCase()), 200);
    return () => clearTimeout(id);
  }, [query]);

  const names = useMemo(
    () => new Map(allPlants.map((p) => [p.id, p.displayName ?? t(`plants.catalog.${p.id}.name`, { defaultValue: p.id })])),
    [allPlants, t],
  );
  const sorted = useMemo(
    () => [...allPlants].sort((a, b) => (names.get(a.id) ?? "").localeCompare(names.get(b.id) ?? "")),
    [allPlants, names],
  );
  const relation = useRelations(allPlants);

  const focusParam = searchParams.get("plant");
  const focusId = focusParam && names.has(focusParam) ? focusParam : null;
  const setFocus = useCallback(
    (id: string | null) => setSearchParams(id ? { plant: id } : {}, { replace: true }),
    [setSearchParams],
  );
  const toggleFocus = useCallback(
    (id: string) => setSearchParams((prev) => (prev.get("plant") === id ? new URLSearchParams() : { plant: id }), { replace: true }),
    [setSearchParams],
  );

  const filtered = useMemo(() => {
    if (!search) return sorted;
    // Keep the focused plant visible so its row/column stays as reference.
    return sorted.filter((p) => p.id === focusId || (names.get(p.id) ?? "").toLowerCase().includes(search));
  }, [sorted, search, names, focusId]);

  const showMatrix = isDesktop && view === "matrix";

  return (
    <div>
      <PageHeader
        title={t("companions.title")}
        description={t("companions.subtitle")}
        actions={
          isDesktop ? (
            <SegmentedControl
              label={t("companions.viewLabel")}
              value={view}
              onChange={setView}
              options={[
                { value: "matrix", label: t("companions.matrixView"), icon: Grid3x3 },
                { value: "plant", label: t("companions.byPlant"), icon: ListTree },
              ]}
            />
          ) : undefined
        }
      />

      {showMatrix ? (
        <>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="relative lg:w-72">
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
              <Input
                type="search"
                aria-label={t("companions.search")}
                placeholder={t("companions.search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              wrapperClassName="lg:w-60"
              aria-label={t("companions.focusLabel")}
              value={focusId ?? ""}
              onChange={(e) => setFocus(e.target.value || null)}
              placeholder={t("companions.focusNone")}
              options={sorted.map((p) => ({ value: p.id, label: names.get(p.id) ?? p.id }))}
            />
            <div className="lg:ml-auto"><Legend /></div>
          </div>
          {filtered.length === 0 ? (
            <Card>
              <p className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Info size={16} aria-hidden="true" />
                {t("companions.emptyFilter")}
              </p>
            </Card>
          ) : (
            <MatrixView plants={filtered} names={names} relation={relation} focusId={focusId} onFocus={toggleFocus} />
          )}
        </>
      ) : (
        <PartnerFinder
          plants={sorted}
          names={names}
          relation={relation}
          selectedId={focusId ?? sorted[0]?.id ?? ""}
          onSelect={(id) => { setFocus(id); document.querySelector("main")?.scrollTo({ top: 0 }); }}
        />
      )}
    </div>
  );
}
