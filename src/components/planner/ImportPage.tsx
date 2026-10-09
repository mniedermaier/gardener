import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download, Eye, LayoutGrid, Link2Off, Share2, Upload } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { decodeGardenFromUrl, importTemplateToStore } from "@/lib/sharing";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { List, ListRow } from "@/components/ui/List";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { useToast } from "@/components/ui/Toast";

const MAX_ICONS = 5;

/** The template part of a pasted share link: the `t` parameter of a full URL, or the bare token. */
export function shareTokenFromText(text: string): string | null {
  const s = text.trim();
  if (!s) return null;
  const m = s.match(/[?&]t=([^&\s#]+)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  }
  return /\s/.test(s) ? null : s;
}

/** Paste a share link someone sent you: validates it and opens the same preview as following the link. */
function PasteLink() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [error, setError] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const token = shareTokenFromText(text);
    if (!token || !decodeGardenFromUrl(token)) {
      setError(true);
      return;
    }
    navigate(`/import?t=${encodeURIComponent(token)}`);
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <Input
        wrapperClassName="min-w-0 flex-1"
        label={t("importPage.pasteLabel")}
        placeholder={t("importPage.pastePlaceholder")}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError(false);
        }}
        error={error ? t("importPage.pasteInvalid") : undefined}
        inputMode="url"
        autoComplete="off"
      />
      <Button type="submit" className="sm:mt-6" disabled={!text.trim()}>
        <Eye size={16} aria-hidden="true" />
        {t("importPage.preview")}
      </Button>
    </form>
  );
}

/** Landing page of a shared garden link (#/import?t=…): preview, name, import. */
export function ImportPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { formatNumber } = useFormat();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();
  const { addGarden, addBed, setCell, setActiveGarden } = useStore(
    useShallow((s) => ({ addGarden: s.addGarden, addBed: s.addBed, setCell: s.setCell, setActiveGarden: s.setActiveGarden })),
  );

  const encoded = searchParams.get("t");
  // Derived from the URL only — no effect, no state needed.
  const template = useMemo(() => (encoded ? decodeGardenFromUrl(encoded) : null), [encoded]);
  const [name, setName] = useState(template?.name ?? "");

  // Opened without a link (e.g. from the menu): explain the page instead of reporting a broken link.
  // Restoring your own data is a different task: a quiet link straight to the backup section.
  const restoreLink = (
    <Button variant="ghost" className="-ml-3 self-start" onClick={() => navigate("/settings?section=data")}>
      <Upload size={16} aria-hidden="true" />
      {t("importPage.restoreBackup")}
    </Button>
  );

  // Opened without a link (e.g. from the menu) or with a broken one: paste a link here instead of a dead end.
  if (!encoded || !template) {
    const broken = Boolean(encoded);
    const Icon = broken ? Link2Off : Share2;
    return (
      <div>
        <PageHeader title={t("importPage.title")} description={t("importPage.noLinkSubtitle")} />
        <Card className="max-w-3xl">
          <div className="flex items-start gap-3">
            <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg ${broken ? "bg-warning/10 text-warning" : "bg-garden-50 text-garden-700 dark:bg-garden-500/15 dark:text-garden-300"}`} aria-hidden="true">
              <Icon size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t(broken ? "importPage.invalidTitle" : "importPage.noLinkTitle")}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t(broken ? "importPage.invalidText" : "importPage.noLinkText")}</p>
            </div>
          </div>
          <div className="mt-5">
            <PasteLink />
          </div>
          <div className="mt-4 flex flex-col border-t border-gray-100 pt-3 dark:border-white/10">
            {restoreLink}
          </div>
        </Card>
      </div>
    );
  }

  const plantings = template.beds.reduce((s, b) => s + b.cells.length, 0);
  const finalName = name.trim() || template.name;
  const bedsText = t("importPage.beds", { count: template.beds.length });
  const plantingsText = t("importPage.plantings", { count: plantings });

  const handleImport = () => {
    const gardenId = importTemplateToStore(
      template,
      () => addGarden(finalName),
      (gid, bed) => addBed(gid, { ...bed, environmentType: bed.environmentType as "outdoor_bed" }),
      setCell,
      useStore.getState,
    );
    setActiveGarden(gardenId);
    toast(t("importPage.done", { name: finalName }), "success");
    navigate("/planner");
  };

  return (
    <div>
      <PageHeader title={t("importPage.title")} description={t("importPage.subtitle")} />
      <div className="max-w-3xl space-y-6">
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{template.name}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("importPage.summary", { beds: bedsText, plantings: plantingsText })}
          </p>
          <Input wrapperClassName="mt-5" label={t("importPage.nameLabel")} value={name} onChange={(e) => setName(e.target.value)} hint={t("importPage.nameHint")} />
        </Card>

        {template.beds.length > 0 && (
          <List header={t("importPage.bedsHeader")}>
            {template.beds.map((bed, i) => {
              const ids = [...new Set(bed.cells.map(([, , pid]) => pid))];
              return (
                <ListRow
                  key={`${bed.name}-${i}`}
                  leading={<span className="inline-flex size-8 items-center justify-center rounded-lg bg-garden-50 text-garden-700 dark:bg-garden-500/15 dark:text-garden-300"><LayoutGrid size={16} aria-hidden="true" /></span>}
                  title={bed.name}
                  meta={[
                    t("importPage.size", { w: formatNumber(bed.w), h: formatNumber(bed.h) }),
                    t("importPage.plantings", { count: bed.cells.length }),
                  ]}
                  description={ids.length ? ids.map((id) => getPlantName(id)).join(", ") : undefined}
                  trailing={
                    <span className="flex -space-x-1" aria-hidden="true">
                      {ids.slice(0, MAX_ICONS).map((id) => {
                        const p = plantMap.get(id);
                        return p ? <span key={id} className="rounded-full bg-white p-0.5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-white/10"><PlantIconDisplay plantId={id} emoji={p.icon} size={20} /></span> : null;
                      })}
                    </span>
                  }
                />
              );
            })}
          </List>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate("/planner")}>{t("common.cancel")}</Button>
          <Button onClick={handleImport}>
            <Download size={16} aria-hidden="true" />
            {t("importPage.importAction")}
          </Button>
        </div>
      </div>
    </div>
  );
}
