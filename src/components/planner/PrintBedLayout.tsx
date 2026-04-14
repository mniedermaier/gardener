import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Garden } from "@/types/garden";
import type { Plant } from "@/types/plant";

interface PrintBedLayoutProps {
  garden: Garden;
  plants: Plant[];
  gridCellSizeCm: number;
  getPlantName: (id: string) => string;
}

export function PrintBedLayout({ garden, plants, gridCellSizeCm, getPlantName }: PrintBedLayoutProps) {
  const { t } = useTranslation();

  const plantMap = useMemo(() => {
    const map = new Map<string, Plant>();
    for (const p of plants) map.set(p.id, p);
    return map;
  }, [plants]);

  const today = new Date().toLocaleDateString();

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-bed-layout, #print-bed-layout * { visibility: visible !important; }
          #print-bed-layout {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 16px !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
      <div id="print-bed-layout">
        {/* Header controls - hidden when printing */}
        <div className="no-print mb-4 flex items-center gap-3">
          <Button onClick={() => window.print()} size="sm">
            <Printer size={16} />
            {t("planner.print")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Dispatch a custom event so the parent can close us
              window.dispatchEvent(new CustomEvent("close-print-view"));
            }}
          >
            <X size={16} />
            {t("common.close")}
          </Button>
        </div>

        {/* Print header */}
        <div className="mb-6 border-b border-gray-300 pb-3 print:border-black">
          <h1 className="text-2xl font-bold text-gray-900 print:text-black">
            {garden.name} — {t("planner.printTitle")}
          </h1>
          <p className="mt-1 text-sm text-gray-500 print:text-gray-700">
            {t("season.current", { year: garden.season })} | {today}
          </p>
        </div>

        {/* Beds */}
        <div className="space-y-8">
          {garden.beds.map((bed) => {
            const widthCm = bed.width * gridCellSizeCm;
            const heightCm = bed.height * gridCellSizeCm;
            const pathSet = new Set(bed.paths ?? []);

            // Collect unique plants in this bed
            const bedPlantIds = new Set<string>();
            for (const cell of bed.cells) bedPlantIds.add(cell.plantId);

            // Build cell lookup
            const cellMap = new Map<string, string>();
            for (const cell of bed.cells) {
              cellMap.set(`${cell.cellX}-${cell.cellY}`, cell.plantId);
            }

            return (
              <div key={bed.id} className="break-inside-avoid">
                <h2 className="mb-2 text-lg font-semibold text-gray-800 print:text-black">
                  {bed.name}
                  <span className="ml-2 text-sm font-normal text-gray-500 print:text-gray-700">
                    {widthCm} × {heightCm} cm
                  </span>
                </h2>

                {/* Grid */}
                <div
                  className="inline-block border border-gray-400 print:border-black"
                  style={{ lineHeight: 0 }}
                >
                  {Array.from({ length: bed.height }, (_, y) => (
                    <div key={y} className="flex" style={{ lineHeight: "normal" }}>
                      {Array.from({ length: bed.width }, (_, x) => {
                        const key = `${x}-${y}`;
                        const isPath = pathSet.has(key);
                        const plantId = cellMap.get(key);
                        const plant = plantId ? plantMap.get(plantId) : undefined;
                        const shortName = plant
                          ? getPlantName(plant.id).slice(0, 3)
                          : "";

                        return (
                          <div
                            key={key}
                            className={`flex flex-col items-center justify-center border border-gray-200 text-center print:border-gray-400 ${
                              isPath
                                ? "bg-gray-300 print:bg-gray-300"
                                : plant
                                  ? "bg-white print:bg-white"
                                  : "bg-gray-50 print:bg-white"
                            }`}
                            style={{ width: 48, height: 48 }}
                          >
                            {isPath ? (
                              <span className="text-[10px] text-gray-500">///</span>
                            ) : plant ? (
                              <>
                                <span className="text-sm leading-none">{plant.icon}</span>
                                <span className="text-[8px] leading-tight text-gray-600 print:text-black">
                                  {shortName}
                                </span>
                              </>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                {bedPlantIds.size > 0 && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-semibold text-gray-600 print:text-black">
                      {t("planner.legend")}:
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {Array.from(bedPlantIds).map((pid) => {
                        const p = plantMap.get(pid);
                        if (!p) return null;
                        return (
                          <span
                            key={pid}
                            className="inline-flex items-center gap-1 text-xs text-gray-700 print:text-black"
                          >
                            <span>{p.icon}</span>
                            {getPlantName(pid)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
