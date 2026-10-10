import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";

/** Good or unfavourable neighbours as a wrap of chips (plant detail, companion finder without beds). */
export function PartnerChips({ ids, kind, onSelect }: { ids: string[]; kind: "good" | "bad"; onSelect: (id: string) => void }) {
  const getPlantName = usePlantName();
  const plantMap = usePlantMap();
  // The group heading says good or bad; the chip carries only the plant (border tone as a quiet second cue).
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border py-1 pl-2 pr-3 text-sm text-gray-800 transition-colors hover:bg-gray-50 sm:min-h-9 dark:text-gray-100 dark:hover:bg-white/5 ${
            kind === "good" ? "border-positive/40" : "border-warning/40"
          }`}
        >
          <PlantIconDisplay plantId={id} emoji={plantMap.get(id)?.icon ?? ""} size={18} />
          {getPlantName(id)}
        </button>
      ))}
    </div>
  );
}
