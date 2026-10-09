import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
  Beaker, LayoutGrid, FlaskConical, Layers, Leaf, Lightbulb, Package, Pencil, Plus, Recycle, Sprout, Trash2, Mountain, Tractor, type LucideIcon,
} from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { useFormat } from "@/hooks/useFormat";
import { todayISO } from "@/lib/format";
import { assessPh, bedPhTarget, phStatus, NUTRIENT_RANGE, nutrientLevel, type Nutrient, type PhAdvice, type PhRange } from "@/lib/soil";
import { usePlantName } from "@/hooks/usePlantName";
import type { Amendment, AmendmentType, SoilTest } from "@/types/soil";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Menu } from "@/components/ui/Menu";
import { List, ListRow } from "@/components/ui/List";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { useToast, useConfirmDelete } from "@/components/ui/Toast";
import type { Tone } from "@/components/ui/tone";
import { DateField } from "@/components/ui/DateField";
import { useBeds } from "@/components/records/useBeds";

const AMENDMENT_TYPES: AmendmentType[] = ["compost", "manure", "lime", "sulfur", "fertilizer", "mulch", "other"];
const AMENDMENT_ICONS: Record<AmendmentType, LucideIcon> = {
  compost: Recycle, manure: Tractor, lime: Mountain, sulfur: FlaskConical, fertilizer: Sprout, mulch: Leaf, other: Package,
};
const ADVICE_TONE: Record<PhAdvice, Tone> = {
  limeStrong: "danger", limeLight: "warning", optimal: "positive", noLime: "warning", sulfur: "warning", limeVeto: "info", averseHigh: "warning", acidify: "danger",
};
const NUTRIENTS: Nutrient[] = ["nitrogen", "phosphorus", "potassium", "organicMatter"];

const num = (s: string) => Number(s.trim().replace(",", "."));

/**
 * Bullet scale: grey track, the target band, a marker at the value. The
 * value and its level are always written out, so colour is never the only cue.
 */
function Scale({ value, min, max, scaleMin, scaleMax, label }: { value: number; min: number; max: number; scaleMin: number; scaleMax: number; label: string }) {
  const pct = (v: number) => `${Math.min(100, Math.max(0, ((v - scaleMin) / (scaleMax - scaleMin)) * 100))}%`;
  return (
    <div className="relative h-2 rounded-full bg-gray-100 dark:bg-white/10" role="img" aria-label={label}>
      <div className="absolute inset-y-0 rounded-full bg-garden-200 dark:bg-garden-500/40" style={{ left: pct(min), right: `calc(100% - ${pct(max)})` }} />
      <div className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-gray-900 shadow-xs dark:border-gray-900 dark:bg-gray-100" style={{ left: pct(value) }} />
    </div>
  );
}

interface TestDraft { bedId: string; date: string; ph: string; n: string; p: string; k: string; om: string; notes: string }
interface AmendDraft { bedId: string; date: string; type: AmendmentType; material: string; kg: string; cost: string; notes: string }

const emptyTest = (bedId = ""): TestDraft => ({ bedId, date: todayISO(), ph: "", n: "", p: "", k: "", om: "", notes: "" });
const emptyAmend = (bedId = ""): AmendDraft => ({ bedId, date: todayISO(), type: "compost", material: "", kg: "", cost: "", notes: "" });

export function SoilManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const confirmDelete = useConfirmDelete();
  const { formatDate, formatNumber, formatWeight, formatCurrency, locale } = useFormat();
  const { soilTests, amendments, addSoilTest, updateSoilTest, deleteSoilTest, addAmendment, updateAmendment, deleteAmendment } = useStore(
    useShallow((s) => ({
      soilTests: s.soilTests, amendments: s.amendments,
      addSoilTest: s.addSoilTest, updateSoilTest: s.updateSoilTest, deleteSoilTest: s.deleteSoilTest,
      addAmendment: s.addAmendment, updateAmendment: s.updateAmendment, deleteAmendment: s.deleteAmendment,
    })),
  );
  const beds = useBeds();
  const [tab, setTab] = useState<"tests" | "amendments">("tests");

  const bedTarget = useCallback((bedId: string): PhRange => bedPhTarget(beds.byId.get(bedId)?.plantIds ?? []), [beds]);
  const plantName = usePlantName();
  const local = (n: number) => n.toLocaleString(locale, { useGrouping: false, maximumFractionDigits: 2 });

  // ---------------------------------------------------------------- test dialog
  const [testOpen, setTestOpen] = useState(false);
  const [testEditing, setTestEditing] = useState<string | null>(null);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [test, setTest] = useState<TestDraft>(() => emptyTest());
  const patchTest = (p: Partial<TestDraft>) => setTest((d) => ({ ...d, ...p }));

  const openAddTest = () => {
    setTestEditing(null); setTestSubmitted(false); setTest(emptyTest(beds.beds.length === 1 ? beds.beds[0].id : "")); setTestOpen(true);
  };
  const openEditTest = (s: SoilTest) => {
    setTestEditing(s.id); setTestSubmitted(false);
    setTest({ bedId: s.bedId, date: s.date, ph: local(s.ph), n: String(s.nitrogen), p: String(s.phosphorus), k: String(s.potassium), om: s.organicMatter != null ? local(s.organicMatter) : "", notes: s.notes ?? "" });
    setTestOpen(true);
  };

  const testValues = { ph: num(test.ph), n: test.n.trim() ? num(test.n) : 0, p: test.p.trim() ? num(test.p) : 0, k: test.k.trim() ? num(test.k) : 0, om: test.om.trim() ? num(test.om) : undefined };
  const testErrors = {
    bed: testSubmitted && !test.bedId ? t("soil.needBed") : undefined,
    ph: (testSubmitted || test.ph.trim()) && !(testValues.ph >= 3 && testValues.ph <= 10) ? t("soil.invalidPh") : undefined,
    n: !(testValues.n >= 0) ? t("soil.invalidNumber") : undefined,
    p: !(testValues.p >= 0) ? t("soil.invalidNumber") : undefined,
    k: !(testValues.k >= 0) ? t("soil.invalidNumber") : undefined,
    om: testValues.om !== undefined && !(testValues.om >= 0 && testValues.om <= 100) ? t("soil.invalidNumber") : undefined,
  };

  const saveTest = () => {
    setTestSubmitted(true);
    if (!test.bedId || !(testValues.ph >= 3 && testValues.ph <= 10) || testErrors.n || testErrors.p || testErrors.k || testErrors.om) return;
    const fields = {
      bedId: test.bedId, date: test.date, ph: testValues.ph, nitrogen: testValues.n, phosphorus: testValues.p, potassium: testValues.k,
      organicMatter: testValues.om, notes: test.notes.trim() || undefined,
    };
    if (testEditing) { updateSoilTest(testEditing, fields); toast(t("soil.updated"), "success"); }
    else { addSoilTest(fields); toast(t("soil.testAdded"), "success"); }
    setTestOpen(false);
  };

  const removeTest = async (s: SoilTest) => {
    if (!(await confirmDelete("soilTest", [beds.label(s.bedId), formatDate(s.date)].filter(Boolean).join(" · ")))) return;
    deleteSoilTest(s.id);
    setTestOpen(false);
    const { id: _id, ...rest } = s;
    toast(t("soil.deleted"), "success", { action: { label: t("common.undo"), onClick: () => addSoilTest(rest) } });
  };

  // ---------------------------------------------------------------- amendment dialog
  const [amendOpen, setAmendOpen] = useState(false);
  const [amendEditing, setAmendEditing] = useState<string | null>(null);
  const [amendSubmitted, setAmendSubmitted] = useState(false);
  const [amend, setAmend] = useState<AmendDraft>(() => emptyAmend());
  const patchAmend = (p: Partial<AmendDraft>) => setAmend((d) => ({ ...d, ...p }));

  const openAddAmend = () => {
    setAmendEditing(null); setAmendSubmitted(false); setAmend(emptyAmend(beds.beds.length === 1 ? beds.beds[0].id : "")); setAmendOpen(true);
  };
  const openEditAmend = (a: Amendment) => {
    setAmendEditing(a.id); setAmendSubmitted(false);
    setAmend({ bedId: a.bedId, date: a.date, type: a.type, material: a.material, kg: a.quantityKg ? local(a.quantityKg) : "", cost: a.cost != null ? local(a.cost) : "", notes: a.notes ?? "" });
    setAmendOpen(true);
  };

  const amendKg = amend.kg.trim() ? num(amend.kg) : 0;
  const amendCost = amend.cost.trim() ? num(amend.cost) : 0;
  const amendErrors = {
    bed: amendSubmitted && !amend.bedId ? t("soil.needBed") : undefined,
    material: amendSubmitted && !amend.material.trim() ? t("soil.needMaterial") : undefined,
    kg: !(amendKg >= 0) ? t("soil.invalidNumber") : undefined,
    cost: !(amendCost >= 0) ? t("soil.invalidNumber") : undefined,
  };

  const saveAmend = () => {
    setAmendSubmitted(true);
    if (!amend.bedId || !amend.material.trim() || amendErrors.kg || amendErrors.cost) return;
    const fields = {
      bedId: amend.bedId, date: amend.date, type: amend.type, material: amend.material.trim(),
      quantityKg: amendKg, cost: amendCost || undefined, notes: amend.notes.trim() || undefined,
    };
    if (amendEditing) { updateAmendment(amendEditing, fields); toast(t("soil.updated"), "success"); }
    else { addAmendment(fields); toast(t("soil.amendmentAdded"), "success"); }
    setAmendOpen(false);
  };

  const removeAmend = async (a: Amendment) => {
    if (!(await confirmDelete("amendment", [a.material, beds.label(a.bedId), formatDate(a.date)].filter(Boolean).join(" · ")))) return;
    deleteAmendment(a.id);
    setAmendOpen(false);
    const { id: _id, ...rest } = a;
    toast(t("soil.deleted"), "success", { action: { label: t("common.undo"), onClick: () => addAmendment(rest) } });
  };

  // ---------------------------------------------------------------- views
  const sortedTests = useMemo(() => [...soilTests].sort((a, b) => b.date.localeCompare(a.date)), [soilTests]);
  const sortedAmendments = useMemo(() => [...amendments].sort((a, b) => b.date.localeCompare(a.date)), [amendments]);
  const bedName = (id: string) => beds.label(id) ?? t("soil.unknownBed");
  const rangeText = (r: PhRange) => t("soil.phRange", { min: formatNumber(r.min, { minimumFractionDigits: 1 }), max: formatNumber(r.max, { minimumFractionDigits: 1 }) });
  const nutrientValue = (n: Nutrient, v: number) => (n === "organicMatter" ? `${formatNumber(v)}\u00a0%` : t("soil.ppm", { value: formatNumber(v, { maximumFractionDigits: 0 }) }));

  const testEditingItem = testEditing ? soilTests.find((s) => s.id === testEditing) : undefined;
  const amendEditingItem = amendEditing ? amendments.find((a) => a.id === amendEditing) : undefined;
  const draftTarget = test.bedId ? bedTarget(test.bedId) : undefined;
  // Tests and amendments belong to a bed: without one the empty states point to the planner.
  const noBeds = beds.beds.length === 0;
  const toPlanner = <Button onClick={() => navigate("/planner")}><LayoutGrid size={16} aria-hidden="true" />{t("importPage.toPlanner")}</Button>;

  return (
    <div>
      <PageHeader
        title={t("soil.title")}
        description={t("soil.subtitle")}
        // One action, the one for the open tab; none while that tab's empty state carries it.
        actions={
          tab === "tests" && sortedTests.length > 0 ? (
            <Button onClick={openAddTest}>
              <Beaker size={16} aria-hidden="true" />
              {t("soil.addTest")}
            </Button>
          ) : tab === "amendments" && sortedAmendments.length > 0 ? (
            <Button onClick={openAddAmend}>
              <Leaf size={16} aria-hidden="true" />
              {t("soil.addAmendment")}
            </Button>
          ) : undefined
        }
        tabs={
          <Tabs
            label={t("soil.title")}
            value={tab}
            onChange={setTab}
            items={[
              { value: "tests", label: t("soil.tests"), count: soilTests.length || undefined },
              { value: "amendments", label: t("soil.amendments"), count: amendments.length || undefined },
            ]}
          />
        }
      />

      {tab === "tests" && (
        sortedTests.length === 0 ? (
          <Card>
            <EmptyState
              icon={Beaker}
              title={t("soil.emptyTestsTitle")}
              description={noBeds ? t("soil.emptyNoBeds") : t("soil.emptyTestsText")}
              action={noBeds ? toPlanner : <Button onClick={openAddTest}><Plus size={16} aria-hidden="true" />{t("soil.addTest")}</Button>}
            />
          </Card>
        ) : (
          // Masonry columns: cards keep their own height and fill the holes a two-column grid leaves.
          <div className="gap-4 md:columns-2">
            {sortedTests.map((s) => {
              const assessment = assessPh(s.ph, beds.byId.get(s.bedId)?.plantIds ?? []);
              const { advice, target } = assessment;
              const averseNames = assessment.limeAverse.map((id) => plantName(id)).join(", ");
              const reasons = assessment.limeAverse.map((id) => t(`soil.limeReason.${id}`, { defaultValue: "" })).filter(Boolean).join(" ");
              const nutrientHints = NUTRIENTS.flatMap((n) => {
                const v = n === "nitrogen" ? s.nitrogen : n === "phosphorus" ? s.phosphorus : n === "potassium" ? s.potassium : s.organicMatter;
                if (v === undefined || (n !== "organicMatter" && v === 0)) return [];
                const level = nutrientLevel(n, v);
                return level === "optimal" ? [] : [t(`soil.nutrientAdvice.${n}.${level}`)];
              });
              return (
                <article key={s.id} className="relative mb-4 break-inside-avoid rounded-xl border border-gray-200 bg-white p-4 shadow-xs sm:p-5 dark:border-white/10 dark:bg-gray-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        <button type="button" onClick={() => openEditTest(s)} className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-focus">
                          {bedName(s.bedId)}
                        </button>
                      </h2>
                      <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <time dateTime={s.date}>{formatDate(s.date)}</time>
                        {beds.byId.has(s.bedId) && (
                          <>
                            <span aria-hidden="true">·</span>
                            <Link to={`/planner?bed=${encodeURIComponent(s.bedId)}`} className="relative z-10 inline-flex min-h-11 items-center gap-1 font-medium text-garden-700 hover:underline sm:min-h-0 dark:text-garden-300">
                              <LayoutGrid size={12} aria-hidden="true" />
                              {t("soil.openInPlanner")}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="relative z-10 -mt-1 -mr-2">
                      <Menu
                        label={t("common.moreActions")}
                        items={[
                          { label: t("common.edit"), icon: Pencil, onSelect: () => openEditTest(s) },
                          ...(beds.byId.has(s.bedId) ? [{ label: t("soil.openInPlanner"), icon: LayoutGrid, onSelect: () => navigate(`/planner?bed=${encodeURIComponent(s.bedId)}`) }] : []),
                          "separator",
                          { label: t("common.delete"), icon: Trash2, danger: true, onSelect: () => void removeTest(s) },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("soil.ph")}</span>
                      <span className="flex items-baseline gap-2">
                        <span className="text-xl font-semibold text-gray-900 tabular-nums dark:text-gray-50">{formatNumber(s.ph)}</span>
                        <Badge tone={ADVICE_TONE[phStatus(advice)]} dot>{t(`soil.phStatus.${phStatus(advice)}`)}</Badge>
                      </span>
                    </div>
                    <Scale value={s.ph} min={target.min} max={target.max} scaleMin={4} scaleMax={9} label={`${t("soil.ph")} ${formatNumber(s.ph)}, ${t("soil.target")} ${rangeText(target)}`} />
                    <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400" aria-hidden="true">
                      <span>{formatNumber(4)}</span>
                      <span>{t("soil.target")} {rangeText(target)}</span>
                      <span>{formatNumber(9)}</span>
                    </div>
                  </div>

                  <p className="mt-3 flex gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-white/5 dark:text-gray-300">
                    <Lightbulb size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-500 dark:text-gray-400" />
                    <span>
                      {t(`soil.phAdvice.${advice}`, { range: rangeText(target), crops: averseNames, ph: formatNumber(s.ph), reason: reasons })}
                      {(advice === "limeStrong" || advice === "limeLight") && assessment.limeLoving.length > 0 && <> {t("soil.brassicaNote")}</>}
                    </span>
                  </p>

                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
                    {NUTRIENTS.map((n) => {
                      const value = n === "nitrogen" ? s.nitrogen : n === "phosphorus" ? s.phosphorus : n === "potassium" ? s.potassium : s.organicMatter;
                      // 0 ppm means "not measured" (the fields are optional).
                      if (value === undefined || (n !== "organicMatter" && value === 0)) return null;
                      const r = NUTRIENT_RANGE[n];
                      const level = nutrientLevel(n, value);
                      return (
                        <div key={n}>
                          <dt className="flex items-baseline justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{t(`soil.nutrients.${n}`)}</span>
                            <span className={level === "optimal" ? "" : "font-medium text-warning"}>{t(`soil.levels.${level}`)}</span>
                          </dt>
                          <dd className="mt-0.5">
                            <span className="text-sm font-medium text-gray-900 tabular-nums dark:text-gray-100">{nutrientValue(n, value)}</span>
                            <div className="mt-1">
                              <Scale value={value} min={r.min} max={r.max} scaleMin={0} scaleMax={r.scaleMax} label={`${t(`soil.nutrients.${n}`)}: ${t(`soil.levels.${level}`)}`} />
                            </div>
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                  {/* Two measures up front, the rest one tap away, so a card stays scannable. */}
                  {nutrientHints.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      {nutrientHints.slice(0, 2).map((line) => <li key={line} className="flex gap-2"><span aria-hidden="true" className="text-gray-500">–</span><span>{line}</span></li>)}
                    </ul>
                  )}
                  {nutrientHints.length > 2 && (
                    <details className="relative z-10 mt-1 text-sm text-gray-700 dark:text-gray-300">
                      <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium text-garden-700 hover:underline sm:min-h-0 sm:py-1 dark:text-garden-300">
                        {t("soil.moreMeasures", { count: nutrientHints.length - 2 })}
                      </summary>
                      <ul className="mt-1 space-y-1">
                        {nutrientHints.slice(2).map((line) => <li key={line} className="flex gap-2"><span aria-hidden="true" className="text-gray-500">–</span><span>{line}</span></li>)}
                      </ul>
                    </details>
                  )}
                  {/* The user's own words, set apart from the advice above so the two cannot be read as one. */}
                  {s.notes && (
                    <p className="mt-3 border-l-2 border-gray-200 pl-3 text-sm text-gray-600 dark:border-white/15 dark:text-gray-400">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{t("soil.yourNote")}</span> {s.notes}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )
      )}

      {tab === "amendments" && (
        sortedAmendments.length === 0 ? (
          <Card>
            <EmptyState
              icon={Layers}
              title={t("soil.emptyAmendmentsTitle")}
              description={noBeds ? t("soil.emptyNoBeds") : t("soil.emptyAmendmentsText")}
              action={noBeds ? toPlanner : <Button onClick={openAddAmend}><Plus size={16} aria-hidden="true" />{t("soil.addAmendment")}</Button>}
            />
          </Card>
        ) : (
          <List label={t("soil.amendments")}>
            {sortedAmendments.map((a) => {
              const Icon = AMENDMENT_ICONS[a.type];
              return (
                <ListRow
                  key={a.id}
                  onClick={() => openEditAmend(a)}
                  leading={<span className="inline-flex size-8 items-center justify-center rounded-lg bg-earth-100 text-earth-700 dark:bg-earth-500/15 dark:text-earth-300"><Icon size={16} aria-hidden="true" /></span>}
                  title={a.material}
                  badges={<Badge variant="outline">{t(`soil.types.${a.type}`)}</Badge>}
                  meta={[bedName(a.bedId), <time key="d" dateTime={a.date}>{formatDate(a.date)}</time>]}
                  description={a.notes}
                  trailing={
                    <span className="flex flex-col items-end">
                      {a.quantityKg > 0 && <span>{formatWeight(a.quantityKg * 1000)}</span>}
                      {a.cost ? <span className="text-xs font-normal text-gray-500 dark:text-gray-400">{formatCurrency(a.cost)}</span> : null}
                    </span>
                  }
                  actions={
                    <Menu
                      label={t("common.moreActions")}
                      items={[
                        { label: t("common.edit"), icon: Pencil, onSelect: () => openEditAmend(a) },
                        ...(beds.byId.has(a.bedId) ? [{ label: t("soil.openInPlanner"), icon: LayoutGrid, onSelect: () => navigate(`/planner?bed=${encodeURIComponent(a.bedId)}`) }] : []),
                        "separator",
                        { label: t("common.delete"), icon: Trash2, danger: true, onSelect: () => void removeAmend(a) },
                      ]}
                    />
                  }
                />
              );
            })}
          </List>
        )
      )}

      {/* Soil test: add and edit */}
      <Modal
        open={testOpen}
        onClose={() => setTestOpen(false)}
        title={testEditing ? t("soil.editTest") : t("soil.addTest")}
        footer={
          <>
            {testEditingItem && (
              <Button variant="danger-ghost" className="mr-auto" onClick={() => void removeTest(testEditingItem)}>
                <Trash2 size={16} aria-hidden="true" />{t("common.delete")}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setTestOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={saveTest}>{t("common.save")}</Button>
          </>
        }
      >
        <div className="space-y-5">
          <Select
            label={t("harvest.bed")}
            value={test.bedId}
            onChange={(e) => patchTest({ bedId: e.target.value })}
            placeholder={t("soil.chooseBed")}
            options={beds.options}
            error={testErrors.bed}
            hint={draftTarget ? t("soil.targetHint", { range: rangeText(draftTarget) }) : undefined}
          />
          <DateField label={t("harvest.date")} value={test.date} onChange={(date) => patchTest({ date })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t("soil.ph")} inputMode="decimal" value={test.ph} onChange={(e) => patchTest({ ph: e.target.value })} placeholder={formatNumber(6.5)} error={testErrors.ph} />
            <Input label={`${t("soil.nutrients.organicMatter")} (%)`} inputMode="decimal" value={test.om} onChange={(e) => patchTest({ om: e.target.value })} placeholder={formatNumber(4.5)} error={testErrors.om} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label={t("soil.nShort")} inputMode="decimal" value={test.n} onChange={(e) => patchTest({ n: e.target.value })} placeholder="40" error={testErrors.n} />
            <Input label={t("soil.pShort")} inputMode="decimal" value={test.p} onChange={(e) => patchTest({ p: e.target.value })} placeholder="30" error={testErrors.p} />
            <Input label={t("soil.kShort")} inputMode="decimal" value={test.k} onChange={(e) => patchTest({ k: e.target.value })} placeholder="150" error={testErrors.k} />
          </div>
          <p className="-mt-2 text-xs text-gray-500 dark:text-gray-400">{t("soil.ppmHint")}</p>
          <Textarea label={t("harvest.notes")} optional placeholder={t("common.notesPlaceholder")} rows={2} value={test.notes} onChange={(e) => patchTest({ notes: e.target.value })} />
        </div>
      </Modal>

      {/* Amendment: add and edit */}
      <Modal
        open={amendOpen}
        onClose={() => setAmendOpen(false)}
        title={amendEditing ? t("soil.editAmendment") : t("soil.addAmendment")}
        footer={
          <>
            {amendEditingItem && (
              <Button variant="danger-ghost" className="mr-auto" onClick={() => void removeAmend(amendEditingItem)}>
                <Trash2 size={16} aria-hidden="true" />{t("common.delete")}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setAmendOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={saveAmend}>{t("common.save")}</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label={t("harvest.bed")} value={amend.bedId} onChange={(e) => patchAmend({ bedId: e.target.value })} placeholder={t("soil.chooseBed")} options={beds.options} error={amendErrors.bed} />
            <Select
              label={t("soil.amendmentType")}
              value={amend.type}
              onChange={(e) => patchAmend({ type: e.target.value as AmendmentType })}
              options={AMENDMENT_TYPES.map((type) => ({ value: type, label: t(`soil.types.${type}`) }))}
            />
          </div>
          <Input label={t("soil.material")} value={amend.material} onChange={(e) => patchAmend({ material: e.target.value })} placeholder={t("soil.materialPlaceholder")} error={amendErrors.material} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t("soil.quantityKg")} inputMode="decimal" value={amend.kg} onChange={(e) => patchAmend({ kg: e.target.value })} placeholder="10" error={amendErrors.kg} />
            <Input label={t("soil.cost")} optional inputMode="decimal" value={amend.cost} onChange={(e) => patchAmend({ cost: e.target.value })} placeholder={t("common.examplePlaceholder", { value: formatNumber(12.5, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })} error={amendErrors.cost} />
          </div>
          <DateField label={t("harvest.date")} value={amend.date} onChange={(date) => patchAmend({ date })} />
          <Textarea label={t("harvest.notes")} optional placeholder={t("common.notesPlaceholder")} rows={2} value={amend.notes} onChange={(e) => patchAmend({ notes: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
