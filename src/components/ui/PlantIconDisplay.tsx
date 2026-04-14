import { memo } from "react";
import { PlantIcon, hasPlantSvg } from "./PlantIcon";

interface Props {
  plantId: string;
  emoji: string;
  size?: number;
  className?: string;
}

export const PlantIconDisplay = memo(function PlantIconDisplay({ plantId, emoji, size = 24, className = "" }: Props) {
  if (hasPlantSvg(plantId)) {
    return <PlantIcon plantId={plantId} size={size} className={className} />;
  }
  return (
    <span className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size, fontSize: size * 0.75 }}>
      {emoji}
    </span>
  );
});
