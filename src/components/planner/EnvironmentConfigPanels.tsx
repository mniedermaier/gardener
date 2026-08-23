import { useId } from "react";
import { useTranslation } from "react-i18next";
import type {
  ColdFrameConfig,
  ContainerConfig,
  GreenhouseConfig,
  RaisedBedConfig,
} from "@/types/garden";

/**
 * Compact per-environment settings shown above a bed's grid.
 *
 * Each field generates its own id: these labels used to sit next to their input
 * without htmlFor, so screen readers announced the controls unlabelled.
 */

export function GreenhouseConfigPanel({ config, onChange }: { config: GreenhouseConfig; onChange: (c: GreenhouseConfig) => void }) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <div className="mb-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
      <h4 className="mb-2 text-xs font-semibold text-green-700 dark:text-green-400">{t("planner.greenhouse.title")}</h4>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <label htmlFor={`${id}-1`} className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.material")}</label>
          <select id={`${id}-1`} value={config.material} onChange={(e) => onChange({ ...config, material: e.target.value as GreenhouseConfig["material"] })} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800">
            <option value="glass">{t("planner.greenhouse.materials.glass")}</option>
            <option value="polycarbonate">{t("planner.greenhouse.materials.polycarbonate")}</option>
            <option value="plastic">{t("planner.greenhouse.materials.plastic")}</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-2`} className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.ventilation")}</label>
          <select id={`${id}-2`} value={config.ventilation} onChange={(e) => onChange({ ...config, ventilation: e.target.value as "manual" | "automatic" })} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800">
            <option value="manual">{t("planner.greenhouse.ventilationTypes.manual")}</option>
            <option value="automatic">{t("planner.greenhouse.ventilationTypes.automatic")}</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-3`} className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.frostProtection")}</label>
          <input id={`${id}-3`} type="number" min={0} max={20} value={config.frostProtectionWeeks} onChange={(e) => onChange({ ...config, frostProtectionWeeks: Number(e.target.value) })} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800" />
        </div>
        <div className="flex items-center gap-2">
          <input id={`${id}-4`} type="checkbox" checked={config.heated} onChange={(e) => onChange({ ...config, heated: e.target.checked })} className="rounded border-gray-300" />
          <label htmlFor={`${id}-4`} className="text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.heated")}</label>
        </div>
        {config.heated && (
          <div>
            <label htmlFor={`${id}-5`} className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.heatingType")}</label>
            <select id={`${id}-5`} value={config.heatingType ?? "electric"} onChange={(e) => onChange({ ...config, heatingType: e.target.value as GreenhouseConfig["heatingType"] })} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800">
              <option value="electric">{t("planner.greenhouse.heatingTypes.electric")}</option>
              <option value="gas">{t("planner.greenhouse.heatingTypes.gas")}</option>
              <option value="passive_solar">{t("planner.greenhouse.heatingTypes.passive_solar")}</option>
            </select>
          </div>
        )}
        <div>
          <label htmlFor={`${id}-6`} className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.minTemp")}</label>
          <input id={`${id}-6`} type="number" value={config.minTempC} onChange={(e) => onChange({ ...config, minTempC: Number(e.target.value) })} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800" />
        </div>
        <div>
          <label htmlFor={`${id}-7`} className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.maxTemp")}</label>
          <input id={`${id}-7`} type="number" value={config.maxTempC} onChange={(e) => onChange({ ...config, maxTempC: Number(e.target.value) })} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  );
}

export function ColdFrameConfigPanel({ config, onChange }: { config: ColdFrameConfig; onChange: (c: ColdFrameConfig) => void }) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <div className="mb-4 rounded-lg bg-sky-50 p-3 dark:bg-sky-900/20">
      <div className="flex items-center gap-4">
        <label htmlFor={`${id}-8`} className="text-xs text-gray-600 dark:text-gray-400">{t("planner.coldFrame.frostProtection")}</label>
        <input id={`${id}-8`} type="number" min={0} max={10} value={config.frostProtectionWeeks} onChange={(e) => onChange({ frostProtectionWeeks: Number(e.target.value) })} className="w-20 rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800" />
      </div>
    </div>
  );
}

export function RaisedBedConfigPanel({ config, onChange }: { config: RaisedBedConfig; onChange: (c: RaisedBedConfig) => void }) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <div className="mb-4 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
      <div className="flex items-center gap-4">
        <label htmlFor={`${id}-9`} className="text-xs text-gray-600 dark:text-gray-400">{t("planner.raisedBed.height")}</label>
        <input id={`${id}-9`} type="number" min={20} max={150} value={config.heightCm} onChange={(e) => onChange({ ...config, heightCm: Number(e.target.value) })} className="w-20 rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800" />
      </div>
    </div>
  );
}

export function ContainerConfigPanel({ config, onChange }: { config: ContainerConfig; onChange: (c: ContainerConfig) => void }) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <div className="mb-4 rounded-lg bg-orange-50 p-3 dark:bg-orange-900/20">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-10`} className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.container.volume")}</label>
          <input id={`${id}-10`} type="number" min={1} max={500} value={config.volumeLiters} onChange={(e) => onChange({ ...config, volumeLiters: Number(e.target.value) })} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800" />
        </div>
        <div>
          <label htmlFor={`${id}-11`} className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.container.material")}</label>
          <select id={`${id}-11`} value={config.material} onChange={(e) => onChange({ ...config, material: e.target.value as ContainerConfig["material"] })} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800">
            {(["terracotta", "plastic", "fabric", "wood", "metal"] as const).map((m) => (
              <option key={m} value={m}>{t(`planner.container.materials.${m}`)}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
