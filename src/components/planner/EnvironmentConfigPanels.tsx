import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type {
  ColdFrameConfig,
  ContainerConfig,
  GreenhouseConfig,
  RaisedBedConfig,
} from "@/types/garden";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";

/**
 * Per-environment settings inside the bed dialog. All fields are primitives,
 * so labels, hints and ids are wired up for screen readers.
 */

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
      <legend className="px-1 text-sm font-medium text-gray-700 dark:text-gray-300">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function GreenhouseConfigPanel({ config, onChange }: { config: GreenhouseConfig; onChange: (c: GreenhouseConfig) => void }) {
  const { t } = useTranslation();
  return (
    <Panel title={t("planner.greenhouse.title")}>
      <Select
        label={t("planner.greenhouse.material")}
        value={config.material}
        onChange={(e) => onChange({ ...config, material: e.target.value as GreenhouseConfig["material"] })}
        options={(["glass", "polycarbonate", "plastic"] as const).map((m) => ({ value: m, label: t(`planner.greenhouse.materials.${m}`) }))}
      />
      <Select
        label={t("planner.greenhouse.ventilation")}
        value={config.ventilation}
        onChange={(e) => onChange({ ...config, ventilation: e.target.value as GreenhouseConfig["ventilation"] })}
        options={(["manual", "automatic"] as const).map((m) => ({ value: m, label: t(`planner.greenhouse.ventilationTypes.${m}`) }))}
      />
      <Input
        label={t("planner.greenhouse.frostProtection")}
        type="number"
        min={0}
        max={20}
        value={config.frostProtectionWeeks}
        onChange={(e) => onChange({ ...config, frostProtectionWeeks: Number(e.target.value) })}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input label={t("planner.greenhouse.minTemp")} type="number" value={config.minTempC} onChange={(e) => onChange({ ...config, minTempC: Number(e.target.value) })} />
        <Input label={t("planner.greenhouse.maxTemp")} type="number" value={config.maxTempC} onChange={(e) => onChange({ ...config, maxTempC: Number(e.target.value) })} />
      </div>
      <Checkbox label={t("planner.greenhouse.heated")} checked={config.heated} onChange={(e) => onChange({ ...config, heated: e.target.checked })} />
      {config.heated && (
        <Select
          label={t("planner.greenhouse.heatingType")}
          value={config.heatingType ?? "electric"}
          onChange={(e) => onChange({ ...config, heatingType: e.target.value as GreenhouseConfig["heatingType"] })}
          options={(["electric", "gas", "passive_solar"] as const).map((m) => ({ value: m, label: t(`planner.greenhouse.heatingTypes.${m}`) }))}
        />
      )}
    </Panel>
  );
}

export function ColdFrameConfigPanel({ config, onChange }: { config: ColdFrameConfig; onChange: (c: ColdFrameConfig) => void }) {
  const { t } = useTranslation();
  return (
    <Panel title={t("planner.environmentTypes.cold_frame")}>
      <Input
        label={t("planner.coldFrame.frostProtection")}
        type="number"
        min={0}
        max={10}
        value={config.frostProtectionWeeks}
        onChange={(e) => onChange({ frostProtectionWeeks: Number(e.target.value) })}
      />
    </Panel>
  );
}

export function RaisedBedConfigPanel({ config, onChange }: { config: RaisedBedConfig; onChange: (c: RaisedBedConfig) => void }) {
  const { t } = useTranslation();
  return (
    <Panel title={t("planner.environmentTypes.raised_bed")}>
      <Input
        label={t("planner.raisedBed.height")}
        type="number"
        min={20}
        max={150}
        value={config.heightCm}
        onChange={(e) => onChange({ ...config, heightCm: Number(e.target.value) })}
      />
    </Panel>
  );
}

export function ContainerConfigPanel({ config, onChange }: { config: ContainerConfig; onChange: (c: ContainerConfig) => void }) {
  const { t } = useTranslation();
  return (
    <Panel title={t("planner.environmentTypes.container")}>
      <Input
        label={t("planner.container.volume")}
        type="number"
        min={1}
        max={500}
        value={config.volumeLiters}
        onChange={(e) => onChange({ ...config, volumeLiters: Number(e.target.value) })}
      />
      <Select
        label={t("planner.container.material")}
        value={config.material}
        onChange={(e) => onChange({ ...config, material: e.target.value as ContainerConfig["material"] })}
        options={(["terracotta", "plastic", "fabric", "wood", "metal"] as const).map((m) => ({ value: m, label: t(`planner.container.materials.${m}`) }))}
      />
    </Panel>
  );
}
