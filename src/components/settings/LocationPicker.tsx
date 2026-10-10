import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, LocateFixed, Search, Loader2, Pencil, Keyboard } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/hooks/useFormat";
import { searchPlaces, roundCoord, type Place } from "@/lib/location";

export interface PickedLocation {
  name: string;
  /** "Bayern, Deutschland" when the place came from the search; cleared for the device position or typed values. */
  region?: string;
  lat: number | null;
  lon: number | null;
  /** Metres above sea level, when the geocoder knows it (improves the frost estimate). */
  elevation?: number;
}

interface LocationPickerProps {
  value: PickedLocation;
  onChange: (value: PickedLocation) => void;
  /** First run: the device position is the main way forward (primary, full width on phones). */
  prominent?: boolean;
}

/**
 * Find a place by name (Open-Meteo geocoding, no key), use the device
 * position, or type coordinates by hand. Works offline too: the manual
 * fields never depend on the network.
 */
export function LocationPicker({ value, onChange, prominent = false }: LocationPickerProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { formatNumber } = useFormat();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "empty">("idle");
  const [locating, setLocating] = useState(false);
  const [manual, setManual] = useState(false);
  const hasCoords = value.lat !== null && value.lon !== null;
  const searching = query.trim().length >= 2;
  const shownResults = searching ? results : [];
  const shownStatus = searching ? status : "idle";
  const [editing, setEditing] = useState(!hasCoords);

  // Debounced search (200 ms), aborted when the query changes.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setStatus("loading");
      searchPlaces(q, i18n.resolvedLanguage ?? "de", ctrl.signal)
        .then((places) => {
          setResults(places);
          setStatus(places.length ? "idle" : "empty");
        })
        .catch((e: unknown) => {
          if ((e as Error).name !== "AbortError") setStatus("error");
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, i18n.resolvedLanguage]);

  const pick = (p: Place) => {
    onChange({ name: p.name, region: p.region, lat: roundCoord(p.latitude), lon: roundCoord(p.longitude), elevation: p.elevation });
    setQuery("");
    setResults([]);
    setEditing(false);
  };

  const locate = () => {
    if (!("geolocation" in navigator)) {
      toast(t("location.geoUnavailable"), "error");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({ name: value.name, region: "", lat: roundCoord(pos.coords.latitude), lon: roundCoord(pos.coords.longitude), elevation: pos.coords.altitude ?? undefined });
        setEditing(false);
        toast(t("location.geoSuccess"), "success");
      },
      () => {
        setLocating(false);
        toast(t("location.geoFailed"), "error");
      },
      { timeout: 10000 },
    );
  };

  const coordLabel = hasCoords
    ? t("location.coords", {
        lat: formatNumber(Math.abs(value.lat!), { maximumFractionDigits: 3 }),
        latDir: value.lat! >= 0 ? t("location.north") : t("location.south"),
        lon: formatNumber(Math.abs(value.lon!), { maximumFractionDigits: 3 }),
        lonDir: value.lon! >= 0 ? t("location.east") : t("location.west"),
      })
    : null;

  if (!editing && hasCoords) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-garden-50 text-garden-700 dark:bg-garden-500/15 dark:text-garden-300" aria-hidden="true">
          <MapPin size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{value.name || t("location.unnamed")}</p>
          {/* Region first: it tells apart places with the same name (Neustadt …); the coordinates confirm it. */}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {value.region && <span>{value.region} · </span>}
            <span className="tabular-nums">{coordLabel}</span>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <Pencil size={14} aria-hidden="true" />
          {t("location.change")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          label={t("location.searchLabel")}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("location.searchPlaceholder")}
          autoComplete="off"
          aria-controls={listId}
          className="pl-9"
          hint={
            shownStatus === "error" ? t("location.searchError")
              : shownStatus === "empty" ? t("location.noPlaces")
                : undefined
          }
        />
        <span className="pointer-events-none absolute top-[39px] left-3 text-gray-500 sm:top-[35px] dark:text-gray-400" aria-hidden="true">
          {shownStatus === "loading" ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </span>
      </div>

      {shownResults.length > 0 && (
        <ul id={listId} aria-label={t("location.results")} className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 dark:divide-white/5 dark:border-white/10">
          {shownResults.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => pick(p)}
                className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <MapPin size={16} aria-hidden="true" className="shrink-0 text-gray-500 dark:text-gray-400" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
                  {p.region && <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{p.region}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={prominent ? "flex flex-col items-start gap-1" : "flex flex-wrap items-center gap-2"}>
        <Button variant={prominent ? "primary" : "secondary"} className={prominent ? "w-full" : undefined} onClick={locate} disabled={locating}>
          {locating ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <LocateFixed size={16} aria-hidden="true" />}
          {t("location.useDevice")}
        </Button>
        {/* First run: coordinates are the expert path, so a quiet link under the main action. */}
        <Button variant="ghost" size={prominent ? "sm" : undefined} className={prominent ? "-ml-2 min-h-11 text-garden-700! dark:text-garden-300!" : undefined} onClick={() => setManual((m) => !m)} aria-expanded={manual}>
          {prominent && <Keyboard size={14} aria-hidden="true" />}
          {t("location.manual")}
        </Button>
        {hasCoords && (
          <Button variant="ghost" onClick={() => setEditing(false)}>
            {t("common.cancel")}
          </Button>
        )}
      </div>

      {manual && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label={t("settings.locationName")}
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value, region: "" })}
            wrapperClassName="sm:col-span-3"
          />
          <Input
            label={t("settings.latitude")}
            type="number"
            step="0.001"
            min={-90}
            max={90}
            value={value.lat ?? ""}
            onChange={(e) => onChange({ ...value, region: "", lat: e.target.value === "" ? null : Number(e.target.value) })}
          />
          <Input
            label={t("settings.longitude")}
            type="number"
            step="0.001"
            min={-180}
            max={180}
            value={value.lon ?? ""}
            onChange={(e) => onChange({ ...value, region: "", lon: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </div>
      )}
    </div>
  );
}
