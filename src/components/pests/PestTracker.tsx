import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Bug, Check, Leaf, Pencil, RotateCcw, Trash2, Microscope } from "lucide-react";
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
import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { Menu } from "@/components/ui/Menu";
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
  severity: Severity;
  description: string;
  treatment: string;
  organic: boolean;
}

const emptyDraft = (plantId: string): Draft => ({
  type: "pest", name: "", plantId, bedId: "", severity: 3, description: "", treatment: "", organic: true,
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
      description: pest.description ?? "", treatment: pest.treatment ?? "", organic: pest.organic,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!draft.name.trim()) return;
    const fields = {
      type: draft.type, name: draft.name.trim(), plantId: draft.plantId, bedId: draft.bedId, severity: draft.severity,
      description: draft.description.trim() || undefined, organic: draft.organic,
      treatment: draft.treatment.trim() || undefined,
    };
    if (editingId) {
      const before = pests.find((p) => p.id === editingId);
      const treatmentChanged = (before?.treatment ?? "") !== (fields.treatment ?? "");
      updatePest(editingId, { ...fields, ...(treatmentChanged && fields.treatment ? { treatmentDate: todayISO() } : {}) });
      toast(t("pests.updated"), "success");
    } else {
      addPest({ ...fields, resolved: false, date: todayISO(), ...(fields.treatment ? { treatmentDate: todayISO() } : {}) });
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
        description={t("pests.subtitle")}
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
                        <Badge variant="outline" icon={pest.type === "pest" ? Bug : Microscope}>{t(`pests.types.${pest.type}`)}</Badge>
                        {pest.organic && <Badge tone="brand" icon={Leaf}>{t("pests.organic")}</Badge>}
                        {pest.resolved && <Badge tone="positive" icon={Check}>{t("pests.resolvedLabel")}</Badge>}
                      </>
                    }
                    meta={[plant && getPlantName(pest.plantId), bedName, formatDate(pest.date, "relative")]}
                    description={
                      pest.treatment || pest.description ? (
                        <>
                          {pest.description && <span className="block">{pest.description}</span>}
                          {pest.treatment && (
                            <span className="block">
                              <span className="font-medium">{t("pests.treatment")}:</span> {pest.treatment}
                              {pest.treatmentDate && <span className="text-gray-500 dark:text-gray-400"> · {formatDate(pest.treatmentDate)}</span>}
                            </span>
                          )}
                        </>
                      ) : undefined
                    }
                    actions={
                      <>
                        {!pest.resolved && (
                          <IconButton icon={Check} tone="brand" label={t("pests.resolve")} onClick={() => handleResolve(pest)} />
                        )}
                        <Menu
                          label={t("common.moreActions")}
                          items={[
                            { label: t("common.edit"), icon: Pencil, onSelect: () => openEdit(pest) },
                            ...(pest.resolved
                              ? [{ label: t("pests.reopen"), icon: RotateCcw, onSelect: () => updatePest(pest.id, { resolved: false, resolvedDate: undefined }) }]
                              : []),
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
            <Button onClick={handleSave} disabled={!draft.name.trim()}>{t("common.save")}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <SegmentedControl
            fullWidth
            label={t("pests.types.pest") + " / " + t("pests.types.disease")}
            value={draft.type}
            onChange={(type) => patch({ type })}
            options={[
              { value: "pest", label: t("pests.types.pest"), icon: Bug },
              { value: "disease", label: t("pests.types.disease"), icon: Microscope },
            ]}
          />
          <Input label={t("pests.name")} value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder={t("pests.namePlaceholder")} autoFocus />
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
              value={draft.bedId}
              onChange={(e) => patch({ bedId: e.target.value })}
              placeholder={t("journal.none")}
              options={beds.options}
            />
          )}
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("pests.severity")}: <span className="font-normal text-gray-600 dark:text-gray-400">{t(`pests.severityLevel.${draft.severity}`)}</span>
            </p>
            <SegmentedControl
              fullWidth
              label={t("pests.severity")}
              value={String(draft.severity)}
              onChange={(v) => patch({ severity: Number(v) as Severity })}
              options={SEVERITIES.map((s) => ({ value: String(s), label: String(s) }))}
            />
          </div>
          <Textarea label={t("pests.description")} value={draft.description} onChange={(e) => patch({ description: e.target.value })} rows={2} />
          <Textarea label={t("pests.treatment")} hint={t("pests.treatmentHint")} value={draft.treatment} onChange={(e) => patch({ treatment: e.target.value })} rows={2} />
          <Checkbox label={t("pests.organicOnly")} checked={draft.organic} onChange={(e) => patch({ organic: e.target.checked })} />
        </div>
      </Modal>
    </div>
  );
}
