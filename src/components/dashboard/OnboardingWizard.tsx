import { useId, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import {
  Sprout, MapPin, Snowflake, Flag, ArrowRight, ArrowLeft, LayoutGrid, Apple, Scale, Square, Upload, Sparkles, Loader2, ShieldCheck, Sun, CloudSun,
} from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/hooks/useFormat";
import { usePlantName } from "@/hooks/usePlantName";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { toDate } from "@/lib/format";
import { addWeeks } from "date-fns";
import { applyTheme } from "@/lib/theme";
import { estimateLastFrost, defaultLastFrost, upcomingFrostYear } from "@/lib/location";
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

function StepHeader({ icon: Icon, title, description, visual }: { icon: LucideIcon; title: string; description: string; visual?: ReactNode }) {
  return (
    <div className="mb-6">
      {visual ?? (
        <span className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-garden-50 text-garden-700 dark:bg-garden-500/15 dark:text-garden-300" aria-hidden="true">
          <Icon size={22} />
        </span>
      )}
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

/** Welcome hero: a small raised bed drawn with the catalogue's own plant icons. */
const HERO_PLANTS = ["tomato", "carrot", "strawberry", "pepper", "pumpkin", "onion", "radish", "cucumber"] as const;

function GardenVignette() {
  return (
    <div className="mb-5 rounded-2xl bg-garden-50 p-4 dark:bg-garden-500/10" aria-hidden="true">
      <div className="mx-auto grid max-w-72 grid-cols-4 gap-2 rounded-xl border-4 border-earth-300 bg-earth-100 p-2 dark:border-earth-700 dark:bg-earth-900/40">
        {HERO_PLANTS.map((id) => (
          <span key={id} className="flex aspect-square items-center justify-center rounded-lg bg-white/70 dark:bg-white/5">
            <PlantIconDisplay plantId={id} emoji="" size={44} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Rough last-frost dates for people who do not know theirs (month-day, Central Europe). */
const CLIMATES = [
  { value: "mild", md: "04-25" },
  { value: "mid", md: "05-15" },
  { value: "cold", md: "05-31" },
] as const;

/** What the frost date sets in motion: three familiar crops, live with the chosen date. */
function FrostPreview({ frost }: { frost: string }) {
  const { t } = useTranslation();
  const { formatDate } = useFormat();
  const plantName = usePlantName();
  const base = toDate(frost);
  if (!base) return null;
  const rows = [
    { id: "lettuce", key: "onboarding.previewTransplant", weeks: -2 },
    { id: "tomato", key: "onboarding.previewSowIndoors", weeks: -8 },
    { id: "bean", key: "onboarding.previewSowOutdoors", weeks: 2 },
  ];
  return (
    <div className="mt-5">
      <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">{t("onboarding.previewTitle")}</p>
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-white/5 dark:border-white/10">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <PlantIconDisplay plantId={r.id} emoji="" size={24} />
            <span className="min-w-0 flex-1 font-medium text-gray-900 dark:text-gray-100">{plantName(r.id)}</span>
            <span className="text-gray-600 tabular-nums dark:text-gray-400">{t(r.key, { date: formatDate(addWeeks(base, r.weeks), "dayMonth") })}</span>
          </li>
        ))}
      </ul>
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
  const frostYear = upcomingFrostYear();
  const estimate = location.lat !== null ? estimateLastFrost(location.lat, location.elevation, frostYear) : null;
  const [frostDate, setFrostDate] = useState(() => defaultLastFrost(upcomingFrostYear()));
  // Until the user edits the date, it follows the estimate for the chosen place.
  const [frostTouched, setFrostTouched] = useState(false);
  const shownFrost = frostTouched ? frostDate : estimate ?? frostDate;
  // Prefilled with the default (in the chosen language) so the name is visible, not applied silently.
  const [gardenNameDraft, setGardenName] = useState<string | null>(null);
  const gardenName = gardenNameDraft ?? t("onboarding.defaultGardenName");
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
    if (location.lat !== null && location.lon !== null) setLocation(location.lat, location.lon, location.name.trim(), location.region);
    else if (location.name.trim()) useStore.setState({ locationName: location.name.trim(), locationRegion: "" });
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
    // Top-anchored, not vertically centred: header and progress bar stay at
    // the same height in every step, only the card below grows or shrinks.
    <div className="flex min-h-dvh flex-col items-center bg-gradient-to-b from-garden-50 via-gray-50 to-gray-50 px-4 py-4 pt-safe sm:pt-[8vh] sm:pb-12 dark:from-garden-950/50 dark:via-gray-950 dark:to-gray-950">
      <div className="flex w-full max-w-lg flex-1 flex-col sm:flex-none">
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

        {/* Phones: the card fills the screen and the footer sits at the bottom, in thumb reach. */}
        <Card className="flex flex-1 flex-col shadow-sm sm:min-h-[41rem] sm:flex-none">
          {step === "welcome" && (
            <>
              <StepHeader icon={Sprout} title={t("onboarding.welcome")} description={t("onboarding.welcomeDesc")} visual={<GardenVignette />} />
              <ul className="mb-6 space-y-3">
                {([
                  [LayoutGrid, "onboarding.featurePlan"],
                  [Apple, "onboarding.featureLog"],
                  [Scale, "onboarding.featureSufficiency"],
                  [ShieldCheck, "onboarding.privacy"],
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
              <LocationPicker value={location} onChange={setLocationDraft} prominent />
              {/* What the location unlocks, so skipping is an informed choice. */}
              <p className="mt-6 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t("onboarding.unlockTitle")}</p>
              <ul className="space-y-2.5">
                {([[Sun, "onboarding.unlockSun"], [CloudSun, "onboarding.unlockWeather"], [Snowflake, "onboarding.unlockFrost"]] as const).map(([Icon, key]) => (
                  <li key={key} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-garden-600 dark:text-garden-300" />
                    {t(key)}
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <ShieldCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-garden-600 dark:text-garden-300" />
                {t("onboarding.locationPrivate")}
              </p>
            </>
          )}

          {step === "frost" && (
            <>
              <StepHeader icon={Snowflake} title={t("onboarding.frostTitle")} description={t("onboarding.frostDesc")} />
              <DatePicker
                label={t("settings.lastFrostDate")}
                value={shownFrost}
                display="dayMonth"
                onChange={(e) => {
                  setFrostTouched(true);
                  setFrostDate(e.target.value);
                }}
                hint={
                  estimate
                    ? t("onboarding.frostEstimate", { place: location.name || t("location.unnamed"), date: formatDate(estimate, "dayMonth") })
                    : t("onboarding.frostDefault")
                }
              />
              {estimate && frostTouched && shownFrost !== estimate && (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setFrostTouched(false)}>
                  <Sparkles size={14} aria-hidden="true" />
                  {t("onboarding.useEstimate", { date: formatDate(estimate, "dayMonth") })}
                </Button>
              )}
              {!estimate && (
                <div className="mt-4">
                  <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">{t("onboarding.climateLabel")}</p>
                  <SegmentedControl
                    label={t("onboarding.climateLabel")}
                    value={CLIMATES.find((c) => shownFrost.slice(5) === c.md)?.value ?? ""}
                    onChange={(v) => {
                      const c = CLIMATES.find((x) => x.value === v);
                      if (!c) return;
                      setFrostTouched(true);
                      setFrostDate(`${frostYear}-${c.md}`);
                    }}
                    // Each choice shows its date, so no separate legend line is needed.
                    options={CLIMATES.map((c) => ({
                      value: c.value,
                      label: (
                        <span className="flex flex-col items-center leading-tight">
                          {t(`onboarding.climate.${c.value}`)}
                          <span className="text-xs font-normal opacity-75">{formatDate(`${frostYear}-${c.md}`, "dayMonth")}</span>
                        </span>
                      ),
                    }))}
                    fullWidth
                  />
                </div>
              )}
              <FrostPreview frost={shownFrost} />
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
                  badge={<Badge tone="brand" size="sm">{t("onboarding.recommended")}</Badge>}
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

          <div className="h-6 shrink-0 sm:h-8" aria-hidden="true" />
          {/* Phones: the footer sticks to the bottom edge, so "Weiter"/"Anlegen" is never below the fold. */}
          <div className="sticky bottom-0 -mx-4 -mb-4 mt-auto flex items-center justify-between gap-2 rounded-b-xl border-t border-gray-100 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:mt-auto sm:rounded-none sm:bg-transparent sm:px-0 sm:pt-5 sm:pb-0 sm:backdrop-blur-none dark:border-white/10 dark:bg-gray-900/95 sm:dark:bg-transparent">
            {index > 0 ? (
              <Button variant="ghost" onClick={back}>
                <ArrowLeft size={16} aria-hidden="true" />
                {t("common.back")}
              </Button>
            ) : <span className="hidden sm:block" />}
            <div className={`flex items-center gap-2 ${index === 0 ? "flex-1 sm:flex-none" : ""}`}>
              <Button onClick={step === "start" ? finish : next} disabled={busy} variant={skipLocation ? "secondary" : "primary"} className={index === 0 ? "w-full sm:w-auto" : undefined}>
                {busy && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
                {primaryLabel}
                {step !== "start" && <ArrowRight size={16} aria-hidden="true" />}
              </Button>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
