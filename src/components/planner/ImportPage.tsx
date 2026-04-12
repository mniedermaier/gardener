import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { decodeGardenFromUrl, importTemplateToStore } from "@/lib/sharing";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function ImportPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addGarden, addBed, setCell } = useStore();
  const [status, setStatus] = useState<"loading" | "preview" | "done" | "error">("loading");
  const [templateName, setTemplateName] = useState("");
  const [bedCount, setBedCount] = useState(0);

  const encoded = searchParams.get("t");

  useEffect(() => {
    if (!encoded) {
      setStatus("error");
      return;
    }
    const template = decodeGardenFromUrl(encoded);
    if (!template) {
      setStatus("error");
      return;
    }
    setTemplateName(template.name);
    setBedCount(template.beds.length);
    setStatus("preview");
  }, [encoded]);

  const handleImport = () => {
    if (!encoded) return;
    const template = decodeGardenFromUrl(encoded);
    if (!template) return;
    importTemplateToStore(
      template,
      addGarden,
      (gid, bed) => addBed(gid, { ...bed, environmentType: bed.environmentType as "outdoor_bed" }),
      setCell,
      useStore.getState,
    );
    setStatus("done");
    setTimeout(() => navigate("/"), 1500);
  };

  if (status === "error") {
    return (
      <Card>
        <p className="text-center text-red-500">{t("planner.importError")}</p>
        <div className="mt-4 text-center">
          <Button onClick={() => navigate("/")}>{t("nav.planner")}</Button>
        </div>
      </Card>
    );
  }

  if (status === "done") {
    return (
      <Card>
        <p className="text-center text-garden-600 font-semibold">{t("planner.importSuccess")}</p>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("planner.importTemplate")}</h1>
      <Card>
        <p className="mb-2 text-sm">
          <span className="font-semibold">{templateName}</span>
        </p>
        <p className="mb-4 text-xs text-gray-500">
          {t("season.beds", { count: bedCount })}
        </p>
        <div className="flex gap-2">
          <Button onClick={handleImport}>{t("planner.importNow")}</Button>
          <Button variant="secondary" onClick={() => navigate("/")}>{t("common.cancel")}</Button>
        </div>
      </Card>
    </div>
  );
}
