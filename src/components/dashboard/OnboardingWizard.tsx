import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Sprout, Calendar, ArrowRight, Check } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Step = "welcome" | "location" | "frost" | "garden" | "done";

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { t, i18n } = useTranslation();
  const { setLocale, setLocation, setLastFrostDate, addGarden, locale } = useStore(useShallow((s) => ({ setLocale: s.setLocale, setLocation: s.setLocation, setLastFrostDate: s.setLastFrostDate, addGarden: s.addGarden, locale: s.locale })));
  const [step, setStep] = useState<Step>("welcome");
  const [locationName, setLocationName] = useState("");
  const [frostDate, setFrostDate] = useState("2026-05-15");
  const [gardenName, setGardenName] = useState("");

  const handleGeolocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(pos.coords.latitude, pos.coords.longitude, locationName);
        setStep("frost");
      },
      () => setStep("frost"),
      { timeout: 10000 }
    );
  };

  const handleFinish = () => {
    setLastFrostDate(frostDate);
    if (gardenName.trim()) {
      addGarden(gardenName.trim());
    }
    onComplete();
  };

  return (
    <div className="mx-auto max-w-md py-8">
      {step === "welcome" && (
        <Card>
          <div className="text-center">
            <Sprout size={48} className="mx-auto mb-4 text-garden-600" />
            <h1 className="mb-2 text-2xl font-bold">{t("onboarding.welcome")}</h1>
            <p className="mb-6 text-sm text-gray-500">{t("onboarding.welcomeDesc")}</p>
            <div className="mb-6 flex flex-wrap justify-center gap-2">
              {(["de", "en", "es", "fr"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => { setLocale(lang); i18n.changeLanguage(lang); }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    locale === lang
                      ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800"
                  }`}
                >
                  {{ de: "Deutsch", en: "English", es: "Español", fr: "Français" }[lang]}
                </button>
              ))}
            </div>
            <Button onClick={() => setStep("location")}>
              {t("onboarding.getStarted")} <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {step === "location" && (
        <Card>
          <div className="text-center">
            <MapPin size={36} className="mx-auto mb-3 text-sky-500" />
            <h2 className="mb-2 text-xl font-bold">{t("onboarding.locationTitle")}</h2>
            <p className="mb-4 text-sm text-gray-500">{t("onboarding.locationDesc")}</p>
          </div>
          <div className="space-y-4">
            <Input
              label={t("settings.locationName")}
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="z.B. München, Berlin..."
            />
            <Button variant="secondary" className="w-full" onClick={handleGeolocation}>
              <MapPin size={16} />
              {t("settings.useGeolocation")}
            </Button>
            <Button className="w-full" onClick={() => setStep("frost")}>
              {t("onboarding.next")} <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {step === "frost" && (
        <Card>
          <div className="text-center">
            <Calendar size={36} className="mx-auto mb-3 text-blue-500" />
            <h2 className="mb-2 text-xl font-bold">{t("onboarding.frostTitle")}</h2>
            <p className="mb-4 text-sm text-gray-500">{t("onboarding.frostDesc")}</p>
          </div>
          <div className="space-y-4">
            <Input
              label={t("settings.lastFrostDate")}
              type="date"
              value={frostDate}
              onChange={(e) => setFrostDate(e.target.value)}
            />
            <Button className="w-full" onClick={() => setStep("garden")}>
              {t("onboarding.next")} <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {step === "garden" && (
        <Card>
          <div className="text-center">
            <Sprout size={36} className="mx-auto mb-3 text-garden-500" />
            <h2 className="mb-2 text-xl font-bold">{t("onboarding.gardenTitle")}</h2>
            <p className="mb-4 text-sm text-gray-500">{t("onboarding.gardenDesc")}</p>
          </div>
          <div className="space-y-4">
            <Input
              label={t("planner.gardenName")}
              value={gardenName}
              onChange={(e) => setGardenName(e.target.value)}
              placeholder={t("onboarding.gardenPlaceholder")}
            />
            <Button className="w-full" onClick={handleFinish}>
              <Check size={16} /> {t("onboarding.finish")}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
