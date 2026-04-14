import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, Beaker, Leaf } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { AmendmentType } from "@/types/soil";
import { format } from "date-fns";
import { ENVIRONMENT_ICONS } from "@/types/garden";

const AMENDMENT_ICONS: Record<AmendmentType, string> = {
  compost: "\ud83e\udeb1", manure: "\ud83d\udca9", lime: "\u26aa", sulfur: "\ud83d\udfe1",
  fertilizer: "\ud83c\udf3f", mulch: "\ud83c\udf42", other: "\ud83d\udce6",
};

function PhBadge({ ph }: { ph: number }) {
  const color = ph < 5.5 ? "text-red-600 bg-red-100 dark:bg-red-900/30" :
    ph < 6.0 ? "text-amber-600 bg-amber-100 dark:bg-amber-900/30" :
    ph <= 7.0 ? "text-green-600 bg-green-100 dark:bg-green-900/30" :
    ph <= 7.5 ? "text-amber-600 bg-amber-100 dark:bg-amber-900/30" :
    "text-red-600 bg-red-100 dark:bg-red-900/30";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>pH {ph}</span>;
}

export function SoilManagement() {
  const { t } = useTranslation();
  const { toast, confirm } = useToast();
  const { soilTests, amendments, gardens, addSoilTest, deleteSoilTest, addAmendment, deleteAmendment } = useStore(
    useShallow((s) => ({
      soilTests: s.soilTests, amendments: s.amendments, gardens: s.gardens,
      addSoilTest: s.addSoilTest, deleteSoilTest: s.deleteSoilTest,
      addAmendment: s.addAmendment, deleteAmendment: s.deleteAmendment,
    }))
  );

  const [showAddTest, setShowAddTest] = useState(false);
  const [showAddAmend, setShowAddAmend] = useState(false);
  const [tab, setTab] = useState<"tests" | "amendments">("tests");

  // Test form
  const [testBedId, setTestBedId] = useState("");
  const [testDate, setTestDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [testPh, setTestPh] = useState("6.5");
  const [testN, setTestN] = useState("40");
  const [testP, setTestP] = useState("30");
  const [testK, setTestK] = useState("150");
  const [testOm, setTestOm] = useState("");
  const [testNotes, setTestNotes] = useState("");

  // Amendment form
  const [amendBedId, setAmendBedId] = useState("");
  const [amendDate, setAmendDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amendType, setAmendType] = useState<AmendmentType>("compost");
  const [amendMaterial, setAmendMaterial] = useState("");
  const [amendKg, setAmendKg] = useState("");
  const [amendCost, setAmendCost] = useState("");

  const allBeds = useMemo(() => {
    const beds: Array<{ id: string; name: string; gardenName: string; envIcon: string }> = [];
    for (const g of gardens) {
      for (const b of g.beds) {
        beds.push({ id: b.id, name: b.name, gardenName: g.name, envIcon: ENVIRONMENT_ICONS[b.environmentType ?? "outdoor_bed"] });
      }
    }
    return beds;
  }, [gardens]);

  const handleAddTest = () => {
    if (!testBedId) return;
    addSoilTest({
      bedId: testBedId, date: testDate,
      ph: Number(testPh), nitrogen: Number(testN), phosphorus: Number(testP), potassium: Number(testK),
      organicMatter: testOm ? Number(testOm) : undefined, notes: testNotes || undefined,
    });
    setShowAddTest(false);
    toast(t("soil.testAdded"), "success");
  };

  const handleAddAmendment = () => {
    if (!amendBedId || !amendMaterial) return;
    addAmendment({
      bedId: amendBedId, date: amendDate, type: amendType,
      material: amendMaterial, quantityKg: Number(amendKg),
      cost: amendCost ? Number(amendCost) : undefined,
    });
    setAmendMaterial("");
    setAmendKg("");
    setAmendCost("");
    setShowAddAmend(false);
    toast(t("soil.amendmentAdded"), "success");
  };

  const getBedName = (bedId: string) => {
    const bed = allBeds.find((b) => b.id === bedId);
    return bed ? `${bed.envIcon} ${bed.name}` : bedId;
  };

  // pH recommendations
  const getPhRecommendation = (ph: number): string => {
    if (ph < 5.5) return t("soil.phTooAcid");
    if (ph < 6.0) return t("soil.phSlightlyAcid");
    if (ph <= 7.0) return t("soil.phOptimal");
    if (ph <= 7.5) return t("soil.phSlightlyAlkaline");
    return t("soil.phTooAlkaline");
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("soil.title")}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowAddAmend(true)}>
            <Leaf size={16} />
            {t("soil.addAmendment")}
          </Button>
          <Button size="sm" onClick={() => setShowAddTest(true)}>
            <Beaker size={16} />
            {t("soil.addTest")}
          </Button>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab("tests")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "tests" ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
          <Beaker size={14} className="mr-1 inline" /> {t("soil.tests")} ({soilTests.length})
        </button>
        <button onClick={() => setTab("amendments")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "amendments" ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
          <Leaf size={14} className="mr-1 inline" /> {t("soil.amendments")} ({amendments.length})
        </button>
      </div>

      {/* Soil Tests */}
      {tab === "tests" && (
        soilTests.length === 0 ? (
          <Card><p className="text-center text-gray-500">{t("soil.noTests")}</p></Card>
        ) : (
          <div className="space-y-2">
            {[...soilTests].sort((a, b) => b.date.localeCompare(a.date)).map((test) => (
              <Card key={test.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-medium">{getBedName(test.bedId)}</span>
                      <span className="text-xs text-gray-400">{test.date}</span>
                    </div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <PhBadge ph={test.ph} />
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs dark:bg-blue-900/20">N: {test.nitrogen} ppm</span>
                      <span className="rounded bg-orange-50 px-2 py-0.5 text-xs dark:bg-orange-900/20">P: {test.phosphorus} ppm</span>
                      <span className="rounded bg-purple-50 px-2 py-0.5 text-xs dark:bg-purple-900/20">K: {test.potassium} ppm</span>
                      {test.organicMatter !== undefined && (
                        <span className="rounded bg-earth-100 px-2 py-0.5 text-xs dark:bg-earth-700/30">OM: {test.organicMatter}%</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{getPhRecommendation(test.ph)}</p>
                    {test.notes && <p className="mt-1 text-xs text-gray-400">{test.notes}</p>}
                  </div>
                  <button onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteSoilTest(test.id); }} className="rounded p-1 text-gray-300 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Amendments */}
      {tab === "amendments" && (
        amendments.length === 0 ? (
          <Card><p className="text-center text-gray-500">{t("soil.noAmendments")}</p></Card>
        ) : (
          <div className="space-y-2">
            {[...amendments].sort((a, b) => b.date.localeCompare(a.date)).map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                <span className="text-lg">{AMENDMENT_ICONS[a.type]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.material}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{getBedName(a.bedId)}</span>
                    <span>·</span>
                    <span>{a.date}</span>
                    <span>·</span>
                    <span>{a.quantityKg} kg</span>
                    {a.cost && <><span>·</span><span>{a.cost.toFixed(2)} €</span></>}
                  </div>
                </div>
                <button onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteAmendment(a.id); }} className="rounded p-1 text-gray-300 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Add Test Modal */}
      <Modal open={showAddTest} onClose={() => setShowAddTest(false)} title={t("soil.addTest")}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("harvest.bed")}</label>
            <select value={testBedId} onChange={(e) => setTestBedId(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
              <option value="">--</option>
              {allBeds.map((b) => <option key={b.id} value={b.id}>{b.envIcon} {b.gardenName} / {b.name}</option>)}
            </select>
          </div>
          <Input label={t("harvest.date")} type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input label="pH" type="number" step="0.1" min={3} max={10} value={testPh} onChange={(e) => setTestPh(e.target.value)} />
            <Input label={`${t("soil.organicMatter")} (%)`} type="number" step="0.1" min={0} value={testOm} onChange={(e) => setTestOm(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Input label="N (ppm)" type="number" min={0} value={testN} onChange={(e) => setTestN(e.target.value)} />
            <Input label="P (ppm)" type="number" min={0} value={testP} onChange={(e) => setTestP(e.target.value)} />
            <Input label="K (ppm)" type="number" min={0} value={testK} onChange={(e) => setTestK(e.target.value)} />
          </div>
          <Input label={t("harvest.notes")} value={testNotes} onChange={(e) => setTestNotes(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddTest(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAddTest}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>

      {/* Add Amendment Modal */}
      <Modal open={showAddAmend} onClose={() => setShowAddAmend(false)} title={t("soil.addAmendment")}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("harvest.bed")}</label>
            <select value={amendBedId} onChange={(e) => setAmendBedId(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
              <option value="">--</option>
              {allBeds.map((b) => <option key={b.id} value={b.id}>{b.envIcon} {b.gardenName} / {b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("soil.amendmentType")}</label>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {(["compost", "manure", "lime", "sulfur", "fertilizer", "mulch", "other"] as AmendmentType[]).map((type) => (
                <button key={type} onClick={() => setAmendType(type)}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border p-1.5 text-[10px] ${amendType === type ? "border-garden-500 bg-garden-50 dark:bg-garden-900/30" : "border-gray-200 dark:border-gray-700"}`}>
                  <span>{AMENDMENT_ICONS[type]}</span>
                  {t(`soil.types.${type}`)}
                </button>
              ))}
            </div>
          </div>
          <Input label={t("soil.material")} value={amendMaterial} onChange={(e) => setAmendMaterial(e.target.value)} placeholder={t("soil.materialPlaceholder")} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={`${t("seeds.quantity")} (kg)`} type="number" min={0} step="0.1" value={amendKg} onChange={(e) => setAmendKg(e.target.value)} />
            <Input label={`${t("expenses.amount")} (€)`} type="number" step="0.01" min={0} value={amendCost} onChange={(e) => setAmendCost(e.target.value)} />
          </div>
          <Input label={t("harvest.date")} type="date" value={amendDate} onChange={(e) => setAmendDate(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddAmend(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAddAmendment}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
