import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Bug, Check, Pencil, RotateCcw, Trash2, Microscope } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { useOpenAddParamsOnNavigate } from "@/hooks/useOpenAddOnNavigate";
import { todayISO } from "@/lib/format";
import type { PestEntry } from "@/types/pest";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { PlantCombobox } from "@/components/records/PlantCombobox";
import { useBeds } from "@/components/records/useBeds";
import { useAddFromUrl, type AddParams } from "@/components/records/useAddFromUrl";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { DateField } from "@/components/ui/DateField";
import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Badge";
import { Menu } from "@/components/ui/Menu";
import { IconButton } from "@/components/ui/IconButton";
import { List, ListRow } from "@/components/ui/List";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast, useConfirmDelete } from "@/components/ui/Toast";
import type { Tone } from "@/components/ui/tone";

type Severity = PestEntry["severity"];
type Filter = "active" | "resolved" | "all";

const SEVERITY_TONE: Record<Severity, Tone> = { 1: "neutral", 2: "neutral", 3: "warning", 4: "danger", 5: "danger" };
const SEVERITIES: Severity[] = [1, 2, 3, 4, 5];

interface Draft {
  type: PestEntry["type"];
  name: string;
  plantId: string;
  bedId: string;
  /** Unset until chosen: a preset "Mittel" would be a silent guess (rule 9). */
  severity: Severity | null;
  /** The treatment field is folded away for a new report. */
  treatmentOpen: boolean;
  description: string;
  treatment: string;
  organic: boolean;
  /** When the problem was noticed (often reported a day or two later). */
  date: string;
}

const emptyDraft = (plantId: string): Draft => ({
  type: "pest", name: "", plantId, bedId: "", severity: null, treatmentOpen: false, description: "", treatment: "", organic: false, date: todayISO(),
});

export function PestTracker() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirmDelete = useConfirmDelete();
  const { formatDate } = useFormat();
  const { pests, addPest, updatePest, deletePest } = useStore(
    useShallow((s) => ({ pests: s.pests, addPest: s.addPest, updatePest: s.updatePest, deletePest: s.deletePest }))
  );
  const plants = usePlants();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();

  const [filter, setFilter] = useState<Filter>("active");
  // One dialog for create and edit: editingId === null means "new".
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(""));
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const beds = useBeds();

  const filtered = useMemo(
    () => pests
      .filter((p) => filter === "all" || (filter === "active" ? !p.resolved : p.resolved))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [pests, filter],
  );
  const activeCount = pests.filter((p) => !p.resolved).length;
  const severeCount = pests.filter((p) => !p.resolved && p.severity >= 4).length;

  const openAdd = useCallback((params: AddParams = {}) => {
    setEditingId(null);
    setDraft({ ...emptyDraft(params.plant ?? ""), bedId: params.bed && beds.byId.has(params.bed) ? params.bed : "" });
    setDialogOpen(true);
  }, [beds]);
  const openAddPlain = useCallback(() => openAdd(), [openAdd]);
  useOpenAddParamsOnNavigate(openAdd);
  useAddFromUrl(openAdd);

  const openEdit = (pest: PestEntry) => {
    setEditingId(pest.id);
    setDraft({
      type: pest.type, name: pest.name, plantId: pest.plantId, bedId: pest.bedId, severity: pest.severity,
      description: pest.description ?? "", treatment: pest.treatment ?? "", treatmentOpen: !!pest.treatment, organic: pest.organic, date: pest.date,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!draft.name.trim()) return;
    const fields = {
      type: draft.type, name: draft.name.trim(), plantId: draft.plantId, bedId: draft.bedId, severity: draft.severity ?? 3,
      description: draft.description.trim() || undefined,
      treatment: draft.treatment.trim() || undefined,
      // "Biologisch behandelt" describes a treatment; without one it means nothing.
      organic: draft.treatment.trim() ? draft.organic : false,
      date: draft.date,
    };
    if (editingId) {
      const before = pests.find((p) => p.id === editingId);
      const treatmentChanged = (before?.treatment ?? "") !== (fields.treatment ?? "");
      updatePest(editingId, { ...fields, ...(treatmentChanged && fields.treatment ? { treatmentDate: todayISO() } : {}) });
      toast(t("pests.updated"), "success");
    } else {
      addPest({ ...fields, resolved: false, ...(fields.treatment ? { treatmentDate: todayISO() } : {}) });
      toast(t("pests.added"), "success");
    }
    setDialogOpen(false);
  };

  const handleResolve = (pest: PestEntry) => {
    updatePest(pest.id, { resolved: true, resolvedDate: todayISO() });
    toast(t("pests.resolved"), "success", {
      action: { label: t("common.undo"), onClick: () => updatePest(pest.id, { resolved: false, resolvedDate: undefined }) },
    });
  };

  const handleDelete = async (pest: PestEntry) => {
    const what = [pest.name, pest.plantId ? getPlantName(pest.plantId) : null, formatDate(pest.date)].filter(Boolean).join(" · ");
    if (!(await confirmDelete("pest", what))) return;
    deletePest(pest.id);
    setDialogOpen(false);
    const { id: _id, ...rest } = pest;
    toast(t("pests.deleted"), "success", { action: { label: t("common.undo"), onClick: () => addPest(rest) } });
  };

  const editing = editingId ? pests.find((p) => p.id === editingId) : undefined;

  return (
    <div>
      <PageHeader
        title={t("pests.title")}
        // Live status once there is something to report; the purpose line before that.
        description={pests.length > 0
          ? (severeCount > 0 ? t("pests.summarySevere", { active: activeCount, severe: severeCount }) : t("pests.summary", { count: activeCount }))
          : t("pests.subtitle")}
        // While the empty state shows, its button is the one way in.
        actions={pests.length > 0 ? (
          <Button onClick={openAddPlain}>
            <Plus size={16} aria-hidden="true" />
            {t("pests.add")}
          </Button>
        ) : undefined}
      />

      {pests.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bug}
            title={t("pests.emptyTitle")}
            description={t("pests.emptyText")}
            action={<Button onClick={openAddPlain}><Plus size={16} aria-hidden="true" />{t("pests.add")}</Button>}
          />
        </Card>
      ) : (
        <>
          <SegmentedControl
            className="mb-4"
            label={t("pests.filterLabel")}
            value={filter}
            onChange={setFilter}
            options={[
              { value: "active", label: t("pests.active"), count: activeCount },
              { value: "resolved", label: t("pests.resolvedLabel"), count: pests.length - activeCount },
              { value: "all", label: t("common.all"), count: pests.length },
            ]}
          />

          {filtered.length === 0 ? (
            <Card><p className="text-center text-sm text-gray-500 dark:text-gray-400">{t("pests.emptyFilter")}</p></Card>
          ) : (
            <List label={t("pests.title")}>
              {filtered.map((pest) => {
                const plant = plantMap.get(pest.plantId);
                const bedName = beds.label(pest.bedId);
                return (
                  <ListRow
                    key={pest.id}
                    muted={pest.resolved}
                    onClick={() => openEdit(pest)}
                    leading={plant ? <PlantIconDisplay plantId={pest.plantId} emoji={plant.icon} size={28} /> : <Bug size={20} aria-hidden="true" className="text-gray-500" />}
                    title={pest.name}
                    badges={
                      <>
                        <Badge tone={SEVERITY_TONE[pest.severity]} dot>{t(`pests.severityLevel.${pest.severity}`)}</Badge>
                        {pest.resolved && <Badge tone="positive" icon={Check}>{t("pests.resolvedLabel")}</Badge>}
                      </>
                    }
                    // The kind is the first meta part: one badge (severity) per row leaves the text its width.
                    meta={[t(`pests.types.${pest.type}`), plant && getPlantName(pest.plantId), bedName, formatDate(pest.date, "short")]}
                    // One running text (ListRow clamps it to 2 lines); "bio" is part of the
                    // treatment label instead of a badge that wraps onto its own line.
                    description={
                      pest.treatment || pest.description ? (
                        <>
                          {pest.description}
                          {pest.description && pest.treatment && " "}
                          {pest.treatment && (
                            <>
                              <span className="text-gray-500 dark:text-gray-400">{pest.organic ? t("pests.treatmentOrganic") : t("pests.treatment")}:</span> {pest.treatment}
                            </>
                          )}
                        </>
                      ) : undefined
                    }
                    // The main row action stays visible from sm up (design system: row
                    // actions as IconButton); phones keep it in the menu so the text keeps its width.
                    actions={
                      <>
                      {!pest.resolved && (
                        // Wrapped: IconButton's own inline-flex would beat a "hidden" passed in.
                        <span className="hidden sm:inline-flex"><IconButton icon={Check} label={t("pests.resolve")} onClick={() => handleResolve(pest)} /></span>
                      )}
                      <Menu
                        label={t("common.moreActions")}
                        items={[
                          pest.resolved
                            ? { label: t("pests.reopen"), icon: RotateCcw, onSelect: () => updatePest(pest.id, { resolved: false, resolvedDate: undefined }) }
                            : { label: t("pests.resolve"), icon: Check, onSelect: () => handleResolve(pest) },
                          { label: t("common.edit"), icon: Pencil, onSelect: () => openEdit(pest) },
                          "separator" as const,
                          { label: t("common.delete"), icon: Trash2, danger: true, onSelect: () => void handleDelete(pest) },
                        ]}
                      />
                      </>
                    }
                  />
                );
              })}
            </List>
          )}
        </>
      )}

      {/* Add and edit share one dialog */}
      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingId ? t("pests.edit") : t("pests.add")}
        footer={
          <>
            {editing && (
              <Button variant="danger-ghost" className="mr-auto" onClick={() => void handleDelete(editing)}>
                <Trash2 size={16} aria-hidden="true" />
                {t("common.delete")}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={!draft.name.trim() || draft.severity === null}>{t("common.save")}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <PlantCombobox
            label={t("harvest.plant")}
            plants={plants}
            beds={beds.beds}
            optional
            value={draft.plantId}
            bedId={draft.bedId}
            onChange={({ plantId, bedId }) => patch({ plantId, ...(bedId ? { bedId } : {}) })}
          />
          {beds.beds.length > 0 && (
            <Select
              label={t("harvest.bed")}
              optional
              value={draft.bedId}
              onChange={(e) => patch({ bedId: e.target.value })}
              placeholder={t("harvest.noBed")}
              options={beds.options}
            />
          )}
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{t("pests.kindLabel")}</p>
            <SegmentedControl
              fullWidth
              label={t("pests.kindLabel")}
              value={draft.type}
              onChange={(type) => patch({ type })}
              options={[
                { value: "pest", label: t("pests.types.pest"), icon: Bug },
                { value: "disease", label: t("pests.types.disease"), icon: Microscope },
              ]}
            />
          </div>
          <Input label={t("pests.name")} data-autofocus-field="" value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder={t(`pests.namePlaceholders.${draft.type}`)} />
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("pests.severity")}{draft.severity !== null && <>: <span className="font-normal text-gray-600 dark:text-gray-400">{t(`pests.severityLevel.${draft.severity}`)}</span></>}
            </p>
            <SegmentedControl
              fullWidth
              label={t("pests.severity")}
              value={draft.severity === null ? "" : String(draft.severity)}
              onChange={(v) => patch({ severity: Number(v) as Severity })}
              options={SEVERITIES.map((s) => ({ value: String(s), label: String(s) }))}
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400" aria-hidden="true">
              <span>{t("pests.scaleLow")}</span>
              <span>{t("pests.scaleHigh")}</span>
            </div>
          </div>
          {/* Rule 9: details, then the date, then the free text. */}
          <DateField label={t("pests.date")} value={draft.date} onChange={(date) => patch({ date })} />
          {/* A new report rarely has a treatment yet: folded away, open when editing one that has it. */}
          {draft.treatmentOpen ? (
            <Textarea label={t("pests.treatment")} optional hint={t("pests.treatmentHint")} value={draft.treatment} onChange={(e) => patch({ treatment: e.target.value })} rows={2} placeholder={t("pests.treatmentPlaceholder")} />
          ) : (
            <Button variant="ghost" size="sm" className="-ml-2" onClick={() => patch({ treatmentOpen: true })}>
              <Plus size={14} aria-hidden="true" />
              {t("pests.addTreatment")}
            </Button>
          )}
          {draft.treatment.trim() && (
            <Checkbox label={t("pests.organicOnly")} checked={draft.organic} onChange={(e) => patch({ organic: e.target.checked })} />
          )}
          {/* Rule 9: the free text closes the form and is called "Notizen" in every dialog. */}
          <Textarea label={t("harvest.notes")} optional value={draft.description} onChange={(e) => patch({ description: e.target.value })} rows={2} placeholder={t("pests.descriptionPlaceholder")} />
        </div>
      </Modal>
    </div>
  );
}
