import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sun, Sunrise, Sunset, Clock } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Card } from "@/components/ui/Card";
import { getDaylightInfo, getMonthlyDaylight } from "@/lib/sunlight";

const MONTH_LABELS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LABELS_DE = ["Jan", "Feb", "M\u00e4r", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export function SunlightWidget() {
  const { t, i18n } = useTranslation();
  const { locationLat, locationLon } = useStore(useShallow((s) => ({ locationLat: s.locationLat, locationLon: s.locationLon })));
  const months = i18n.language === "de" ? MONTH_LABELS_DE : MONTH_LABELS_EN;
  const [selectedDate] = useState(new Date());

  const today = useMemo(() => {
    if (locationLat === null || locationLon === null) return null;
    return getDaylightInfo(selectedDate, locationLat, locationLon);
  }, [locationLat, locationLon, selectedDate]);

  const yearlyData = useMemo(() => {
    if (locationLat === null || locationLon === null) return null;
    return getMonthlyDaylight(locationLat, locationLon, selectedDate.getFullYear());
  }, [locationLat, locationLon, selectedDate]);

  if (!today || !yearlyData) return null;

  const maxDaylight = Math.max(...yearlyData.map((d) => d.daylightHours));
  const currentMonth = selectedDate.getMonth();

  return (
    <Card className="mt-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Sun size={18} className="text-amber-500" />
        {t("sunlight.title")}
      </h2>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="flex items-center gap-2">
          <Sunrise size={18} className="text-orange-400" />
          <div>
            <p className="text-lg font-bold">{today.sunrise}</p>
            <p className="text-xs text-gray-500">{t("sunlight.sunrise")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sunset size={18} className="text-orange-500" />
          <div>
            <p className="text-lg font-bold">{today.sunset}</p>
            <p className="text-xs text-gray-500">{t("sunlight.sunset")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-amber-500" />
          <div>
            <p className="text-lg font-bold">{today.daylightHours}h</p>
            <p className="text-xs text-gray-500">{t("sunlight.daylight")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sun size={18} className="text-amber-400" />
          <div>
            <p className="text-lg font-bold">{today.maxAltitudeDeg}°</p>
            <p className="text-xs text-gray-500">{t("sunlight.maxAltitude")}</p>
          </div>
        </div>
      </div>

      <h3 className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
        {t("sunlight.yearlyDaylight")}
      </h3>
      <div className="flex items-end gap-1" style={{ height: "120px" }}>
        {yearlyData.map((d, i) => {
          const heightPercent = (d.daylightHours / maxDaylight) * 100;
          const isCurrent = i === currentMonth;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[9px] font-medium text-gray-500">{d.daylightHours.toFixed(0)}h</span>
              <div
                className={`w-full rounded-t transition-all ${
                  isCurrent ? "bg-amber-400" : "bg-amber-200 dark:bg-amber-700"
                }`}
                style={{ height: `${heightPercent}%` }}
                title={`${months[i]}: ${d.daylightHours}h, max ${d.maxAltitude}°`}
              />
              <span className={`text-[10px] ${isCurrent ? "font-bold text-amber-600" : "text-gray-400"}`}>
                {months[i]}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
