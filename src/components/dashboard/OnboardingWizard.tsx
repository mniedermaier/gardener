import { useId, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import {
  Sprout, MapPin, Snowflake, Flag, ArrowRight, ArrowLeft, LayoutGrid, Apple, Scale, Square, Upload, Sparkles, Loader2,
} from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/hooks/useFormat";
import { applyTheme } from "@/lib/theme";
import { estimateLastFrost, defaultLastFrost } from "@/lib/location";
import { importAllData, validateExportFile } from "@/lib/dataImport";
import { LocationPicker, type PickedLocation } from "@/components/settings/LocationPicker";
import { createStarterGarden } from "./starterGarden";

type Locale = "de" | "en" | "es" | "fr";
type StartMode = "starter" | "empty" | "import";

const STEPS = ["welcome", "location", "frost", "start"] as const;
type Step = (typeof STEPS)[number];

const LANGUAGES: Array<{ value: Locale; label: string }> = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
];

function StepHeader({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="mb-6">
      <span className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-garden-50 text-garden-700 dark:bg-garden-500/15 dark:text-garden-300" aria-hidden="true">
        <Icon size={22} />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">{title}</h1>
      <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}

function StartOption({ id, name, value, checked, onSelect, icon: Icon, title, description, badge }: {
  id: string; name: string; value: StartMode; checked: boolean; onSelect: (v: StartMode) => void;
  icon: LucideIcon; title: string; description: string; badge?: ReactNode;
}) {
  return (
    <div
      className={`relative flex items-start gap-3 rounded-xl border p-4 transition-colors ${
        checked
          ? "border-garden-600 bg-garden-50/60 ring-1 ring-garden-600 dark:border-garden-400 dark:bg-garden-500/10 dark:ring-garden-400"
          : "border-gray-200 hover:border-gray-300 dark:border-white/10 dark:hover:border-white/20"
      }`}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="relative z-10 mt-1 size-4 shrink-0"
      />
      <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${checked ? "bg-garden-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"}`} aria-hidden="true">
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-semibold text-gray-900 after:absolute after:inset-0 after:content-[''] dark:text-gray-100">
          {title}
          {badge}
        </label>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}

/**
 * First run: language → location (place search, device position or manual
 * coordinates) → last frost (estimated from the location) → how to start
 * (starter garden, empty garden or an existing backup).
 */
export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { formatDate } = useFormat();
  const { setLocale, setLocation, setLastFrostDate, addGarden, locale, theme } = useStore(
    useShallow((s) => ({
      setLocale: s.setLocale, setLocation: s.setLocation, setLastFrostDate: s.setLastFrostDate,
      addGarden: s.addGarden, locale: s.locale, theme: s.theme,
    })),
  );
  const radioName = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("welcome");
  const [location, setLocationDraft] = useState<PickedLocation>({ name: "", lat: null, lon: null });
  const estimate = location.lat !== null ? estimateLastFrost(location.lat, location.elevation) : null;
  const [frostDate, setFrostDate] = useState(defaultLastFrost());
  // Until the user edits the date, it follows the estimate for the chosen place.
  const [frostTouched, setFrostTouched] = useState(false);
  const shownFrost = frostTouched ? frostDate : estimate ?? frostDate;
  const [gardenName, setGardenName] = useState("");
  const [mode, setMode] = useState<StartMode>("starter");
  const [busy, setBusy] = useState(false);

  const index = STEPS.indexOf(step);
  const next = () => setStep(STEPS[Math.min(STEPS.length - 1, index + 1)]);
  const back = () => setStep(STEPS[Math.max(0, index - 1)]);

  const changeLanguage = (lang: Locale) => {
    setLocale(lang);
    void i18n.changeLanguage(lang);
  };

  const saveSettings = () => {
    if (location.lat !== null && location.lon !== null) setLocation(location.lat, location.lon, location.name.trim());
    else if (location.name.trim()) useStore.setState({ locationName: location.name.trim() });
    setLastFrostDate(shownFrost);
  };

  const finish = () => {
    if (mode === "import") {
      fileRef.current?.click();
      return;
    }
    saveSettings();
    const name = gardenName.trim() || t("onboarding.defaultGardenName");
    // An empty name must not leave the app without a garden: every page
    // would then greet the new user with "no garden yet".
    if (mode === "starter") createStarterGarden(name, t);
    else addGarden(name);
    toast(t(mode === "starter" ? "onboarding.starterCreated" : "onboarding.gardenCreated", { name }), "success");
    onComplete();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    file.text()
      .then((text) => {
        const json: unknown = JSON.parse(text);
        if (!validateExportFile(json)) throw new Error("invalid");
        const result = importAllData(json, "overwrite");
        if (!result.success) throw new Error(result.error ?? "import");
        // The backup brings its own settings; apply its language and theme.
        const s = useStore.getState();
        void i18n.changeLanguage(s.locale);
        applyTheme(s.theme ?? theme);
        if (s.gardens.length === 0) addGarden(gardenName.trim() || t("onboarding.defaultGardenName"));
        toast(t("dataManagement.importSuccess"), "success");
        onComplete();
      })
      .catch(() => {
        setBusy(false);
        toast(t("dataManagement.invalidFile"), "error");
      });
  };

  const skipLocation = step === "location" && location.lat === null && !location.name.trim();
  const primaryLabel =
    step === "welcome" ? t("onboarding.getStarted")
      : skipLocation ? t("onboarding.skip")
      : step !== "start" ? t("onboarding.next")
        : mode === "import" ? t("onboarding.chooseBackup")
          : mode === "starter" ? t("onboarding.createStarter")
            : t("onboarding.finish");

  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-b from-garden-50 via-gray-50 to-gray-50 px-4 py-8 pt-safe dark:from-garden-950/50 dark:via-gray-950 dark:to-gray-950">
      <div className="w-full max-w-lg">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-garden-600 text-white" aria-hidden="true">
              <Sprout size={18} />
            </span>
            <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-50">{t("app.title")}</span>
          </div>
          <p className="text-xs font-medium text-gray-600 tabular-nums dark:text-gray-400" aria-live="polite">
            {t("onboarding.stepOf", { current: index + 1, total: STEPS.length })}
          </p>
        </div>

        <div className="mb-4 grid grid-cols-4 gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s} className={`h-1.5 rounded-full transition-colors ${i <= index ? "bg-garden-600 dark:bg-garden-400" : "bg-gray-200 dark:bg-white/10"}`} />
          ))}
        </div>

        <Card className="shadow-sm">
          {step === "welcome" && (
            <>
              <StepHeader icon={Sprout} title={t("onboarding.welcome")} description={t("onboarding.welcomeDesc")} />
              <ul className="mb-6 space-y-3">
                {([
                  [LayoutGrid, "onboarding.featurePlan"],
                  [Apple, "onboarding.featureLog"],
                  [Scale, "onboarding.featureSufficiency"],
                ] as const).map(([Icon, key]) => (
                  <li key={key} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-garden-600 dark:text-garden-300" />
                    {t(key)}
                  </li>
                ))}
              </ul>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t("settings.language")}</p>
              <SegmentedControl label={t("settings.language")} value={locale} onChange={changeLanguage} options={LANGUAGES} fullWidth />
            </>
          )}

          {step === "location" && (
            <>
              <StepHeader icon={MapPin} title={t("onboarding.locationTitle")} description={t("onboarding.locationDesc")} />
              <LocationPicker value={location} onChange={setLocationDraft} />
            </>
          )}

          {step === "frost" && (
            <>
              <StepHeader icon={Snowflake} title={t("onboarding.frostTitle")} description={t("onboarding.frostDesc")} />
              <Input
                label={t("settings.lastFrostDate")}
                type="date"
                lang={i18n.resolvedLanguage}
                value={shownFrost}
                onChange={(e) => {
                  setFrostTouched(true);
                  setFrostDate(e.target.value);
                }}
                hint={
                  estimate
                    ? t("onboarding.frostEstimate", { place: location.name || t("location.unnamed"), date: formatDate(estimate, "short") })
                    : t("onboarding.frostDefault")
                }
              />
              {estimate && frostTouched && shownFrost !== estimate && (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setFrostTouched(false)}>
                  <Sparkles size={14} aria-hidden="true" />
                  {t("onboarding.useEstimate", { date: formatDate(estimate, "short") })}
                </Button>
              )}
            </>
          )}

          {step === "start" && (
            <>
              <StepHeader icon={Flag} title={t("onboarding.startTitle")} description={t("onboarding.startDesc")} />
              {mode !== "import" && (
                <Input
                  label={t("planner.gardenName")}
                  value={gardenName}
                  onChange={(e) => setGardenName(e.target.value)}
                  placeholder={t("onboarding.gardenPlaceholder")}
                  wrapperClassName="mb-4"
                />
              )}
              <fieldset className="space-y-2">
                <legend className="sr-only">{t("onboarding.startTitle")}</legend>
                <StartOption
                  id={`${radioName}-starter`} name={radioName} value="starter" checked={mode === "starter"} onSelect={setMode}
                  icon={Sparkles} title={t("onboarding.modeStarter")} description={t("onboarding.modeStarterDesc")}
                  badge={<span className="rounded-full bg-garden-100 px-2 py-0.5 text-xs font-medium text-garden-800 dark:bg-garden-500/20 dark:text-garden-200">{t("onboarding.recommended")}</span>}
                />
                <StartOption
                  id={`${radioName}-empty`} name={radioName} value="empty" checked={mode === "empty"} onSelect={setMode}
                  icon={Square} title={t("onboarding.modeEmpty")} description={t("onboarding.modeEmptyDesc")}
                />
                <StartOption
                  id={`${radioName}-import`} name={radioName} value="import" checked={mode === "import"} onSelect={setMode}
                  icon={Upload} title={t("onboarding.modeImport")} description={t("onboarding.modeImportDesc")}
                />
              </fieldset>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} aria-label={t("onboarding.chooseBackup")} />
            </>
          )}

          <div className="mt-8 flex items-center justify-between gap-2 border-t border-gray-100 pt-5 dark:border-white/10">
            {index > 0 ? (
              <Button variant="ghost" onClick={back}>
                <ArrowLeft size={16} aria-hidden="true" />
                {t("common.back")}
              </Button>
            ) : <span />}
            <div className="flex items-center gap-2">
              <Button onClick={step === "start" ? finish : next} disabled={busy} variant={skipLocation ? "secondary" : "primary"}>
                {busy && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
                {primaryLabel}
                {step !== "start" && <ArrowRight size={16} aria-hidden="true" />}
              </Button>
            </div>
          </div>
        </Card>

        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">{t("onboarding.privacy")}</p>
      </div>
    </div>
  );
}
