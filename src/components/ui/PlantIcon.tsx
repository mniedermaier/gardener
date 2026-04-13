interface Props {
  plantId: string;
  size?: number;
  className?: string;
}

// Simple 24x24 SVG icons for each plant - hand-crafted minimalist style
const PLANT_SVGS: Record<string, string> = {
  // VEGETABLES
  tomato: `<circle cx="12" cy="13" r="8" fill="#ef4444"/><path d="M12 5c-1-2 1-4 1-4s2 2 1 4" fill="#22c55e"/><path d="M9 6c-2-1-2-3-2-3s2 0 2 3" fill="#22c55e"/>`,
  zucchini: `<ellipse cx="12" cy="13" rx="5" ry="8" fill="#65a30d" transform="rotate(-20 12 13)"/><path d="M10 5c0-2 2-3 2-3s2 1 2 3" fill="#22c55e"/>`,
  carrot: `<path d="M12 4l-4 16c0 0 4 2 8 0z" fill="#f97316"/><path d="M10 4c-1-2 0-3 2-3s3 1 2 3" fill="#22c55e"/><line x1="10" y1="10" x2="14" y2="10" stroke="#ea580c" stroke-width="0.5"/>`,
  lettuce: `<ellipse cx="12" cy="14" rx="9" ry="7" fill="#84cc16"/><ellipse cx="12" cy="13" rx="6" ry="5" fill="#a3e635"/><ellipse cx="12" cy="12" rx="3" ry="3" fill="#bef264"/>`,
  bean: `<path d="M7 18c0-6 3-10 5-12s5 6 5 12c0 2-4 3-5 3s-5-1-5-3z" fill="#16a34a"/><path d="M12 8v10" stroke="#15803d" stroke-width="1"/>`,
  pea: `<ellipse cx="12" cy="12" rx="8" ry="6" fill="#22c55e"/><circle cx="8" cy="12" r="2.5" fill="#16a34a"/><circle cx="12" cy="12" r="2.5" fill="#16a34a"/><circle cx="16" cy="12" r="2.5" fill="#16a34a"/>`,
  radish: `<circle cx="12" cy="11" r="6" fill="#e11d48"/><path d="M12 17v5" stroke="#f9a8d4" stroke-width="1.5"/><path d="M10 4c0-1 1-2 2-2s2 1 2 2v4h-4z" fill="#22c55e"/>`,
  cucumber: `<ellipse cx="12" cy="12" rx="4" ry="9" fill="#15803d"/><ellipse cx="12" cy="12" rx="3" ry="8" fill="#22c55e"/><circle cx="11" cy="8" r="0.5" fill="#15803d"/><circle cx="13" cy="11" r="0.5" fill="#15803d"/>`,
  pepper: `<path d="M8 10c0-3 2-5 4-5s4 2 4 5v6c0 2-1 4-2 4h-4c-1 0-2-2-2-4z" fill="#ef4444"/><path d="M11 5c0-2 1-3 1-3s1 1 1 3" fill="#22c55e" stroke="#16a34a" stroke-width="0.5"/>`,
  onion: `<ellipse cx="12" cy="14" rx="7" ry="6" fill="#d97706"/><ellipse cx="12" cy="14" rx="5" ry="4.5" fill="#fbbf24"/><path d="M12 8v-4" stroke="#22c55e" stroke-width="1.5"/><path d="M10 6l2-2 2 2" fill="none" stroke="#22c55e" stroke-width="1"/>`,
  garlic: `<ellipse cx="12" cy="14" rx="6" ry="6" fill="#fef3c7"/><path d="M8 14c0-4 2-6 4-6s4 2 4 6" fill="#fde68a"/><line x1="12" y1="8" x2="12" y2="14" stroke="#e5e7eb" stroke-width="0.5"/><path d="M12 8v-3" stroke="#22c55e" stroke-width="1.5"/>`,
  potato: `<ellipse cx="12" cy="13" rx="8" ry="6" fill="#a16207" transform="rotate(-10 12 13)"/><ellipse cx="12" cy="13" rx="6" ry="4.5" fill="#ca8a04" transform="rotate(-10 12 13)"/><circle cx="9" cy="11" r="0.8" fill="#92400e"/><circle cx="14" cy="14" r="0.8" fill="#92400e"/>`,
  kale: `<path d="M12 20v-8" stroke="#15803d" stroke-width="2"/><path d="M6 10c0-4 3-7 6-7s6 3 6 7c0 3-2 5-6 5s-6-2-6-5z" fill="#166534"/><path d="M8 9c1-2 2-3 4-3s3 1 4 3" fill="#22c55e"/>`,
  spinach: `<path d="M12 22v-10" stroke="#15803d" stroke-width="1.5"/><ellipse cx="12" cy="9" rx="7" ry="6" fill="#14532d"/><ellipse cx="12" cy="9" rx="5" ry="4" fill="#166534"/><line x1="12" y1="5" x2="12" y2="13" stroke="#15803d" stroke-width="0.5"/>`,
  beetroot: `<circle cx="12" cy="13" r="7" fill="#881337"/><circle cx="12" cy="13" r="5" fill="#9f1239"/><path d="M12 20v3" stroke="#be185d" stroke-width="1"/><path d="M10 4c0-1 1-2 2-2s2 1 2 2v3h-4z" fill="#22c55e"/>`,
  leek: `<rect x="10" y="2" width="4" height="12" rx="2" fill="#f0fdf4"/><rect x="10" y="10" width="4" height="12" rx="1" fill="#22c55e"/><path d="M8 2c2-1 4-1 4-1v4c-2 0-4 0-4-1z" fill="#4ade80"/>`,
  pumpkin: `<circle cx="12" cy="14" r="8" fill="#ea580c"/><path d="M12 6c0 0-6 2-6 8" fill="none" stroke="#c2410c" stroke-width="1"/><path d="M12 6c0 0 6 2 6 8" fill="none" stroke="#c2410c" stroke-width="1"/><path d="M12 6v-3c1-1 2 0 2 1" fill="#22c55e" stroke="#16a34a" stroke-width="0.5"/>`,
  chard: `<path d="M12 22v-12" stroke="#dc2626" stroke-width="2.5"/><ellipse cx="12" cy="8" rx="6" ry="6" fill="#22c55e"/><line x1="12" y1="4" x2="12" y2="13" stroke="#dc2626" stroke-width="1"/>`,
  kohlrabi: `<circle cx="12" cy="15" r="6" fill="#a3e635"/><circle cx="12" cy="15" r="4" fill="#bef264"/><path d="M10 9c0-2 1-4 2-4s2 2 2 4" fill="#22c55e"/><path d="M8 8c-1-2 0-4 1-4" fill="#22c55e"/>`,
  fennel: `<rect x="10" y="12" width="4" height="8" rx="2" fill="#fef9c3"/><path d="M12 12v-6" stroke="#22c55e" stroke-width="1"/><path d="M12 6l-4-3" stroke="#22c55e" stroke-width="0.8"/><path d="M12 6l4-3" stroke="#22c55e" stroke-width="0.8"/><path d="M12 8l-3-2" stroke="#22c55e" stroke-width="0.8"/><path d="M12 8l3-2" stroke="#22c55e" stroke-width="0.8"/>`,
  corn: `<rect x="9" y="6" width="6" height="14" rx="3" fill="#eab308"/><rect x="10" y="7" width="1" height="12" rx="0.5" fill="#ca8a04"/><rect x="13" y="7" width="1" height="12" rx="0.5" fill="#ca8a04"/><path d="M9 6c-2-1-3-3-2-4" stroke="#22c55e" stroke-width="1" fill="none"/><path d="M15 6c2-1 3-3 2-4" stroke="#22c55e" stroke-width="1" fill="none"/>`,
  sunflower: `<circle cx="12" cy="12" r="4" fill="#78350f"/><circle cx="12" cy="12" r="3" fill="#92400e"/>${[0,45,90,135,180,225,270,315].map(a => `<ellipse cx="12" cy="4" rx="2" ry="3" fill="#eab308" transform="rotate(${a} 12 12)"/>`).join("")}`,
  cabbage: `<circle cx="12" cy="13" r="8" fill="#86efac"/><circle cx="12" cy="13" r="6" fill="#4ade80"/><circle cx="12" cy="13" r="4" fill="#22c55e"/><circle cx="12" cy="13" r="2" fill="#bbf7d0"/>`,
  broccoli: `<rect x="11" y="14" width="2" height="8" rx="1" fill="#15803d"/><circle cx="8" cy="11" r="3" fill="#16a34a"/><circle cx="12" cy="9" r="3.5" fill="#22c55e"/><circle cx="16" cy="11" r="3" fill="#16a34a"/><circle cx="10" cy="8" r="2" fill="#4ade80"/>`,
  cauliflower: `<rect x="11" y="15" width="2" height="7" rx="1" fill="#22c55e"/><circle cx="9" cy="12" r="3" fill="#fef3c7"/><circle cx="12" cy="10" r="3.5" fill="#fff"/><circle cx="15" cy="12" r="3" fill="#fef3c7"/><circle cx="12" cy="13" r="2.5" fill="#fefce8"/>`,
  celery: `<rect x="10" y="10" width="1.5" height="12" rx="0.5" fill="#a3e635"/><rect x="12.5" y="10" width="1.5" height="12" rx="0.5" fill="#84cc16"/><path d="M11 10c-2-3-1-7 0-8" fill="#22c55e"/><path d="M13 10c2-3 1-7 0-8" fill="#22c55e"/>`,
  turnip: `<ellipse cx="12" cy="14" rx="6" ry="5" fill="#e9d5ff"/><ellipse cx="12" cy="12" rx="5" ry="3" fill="#c084fc"/><path d="M12 19v3" stroke="#d8b4fe" stroke-width="1"/><path d="M10 5c0-2 1-2 2-2s2 0 2 2v3h-4z" fill="#22c55e"/>`,

  // BERRIES
  strawberry: `<path d="M7 10c0 5 2 10 5 10s5-5 5-10c0-3-2-5-5-5s-5 2-5 5z" fill="#ef4444"/><path d="M10 5c-1-2 0-3 2-3s3 1 2 3" fill="#22c55e"/><circle cx="10" cy="12" r="0.5" fill="#fecaca"/><circle cx="14" cy="11" r="0.5" fill="#fecaca"/><circle cx="12" cy="14" r="0.5" fill="#fecaca"/>`,
  raspberry: `<circle cx="10" cy="10" r="2" fill="#be185d"/><circle cx="14" cy="10" r="2" fill="#be185d"/><circle cx="12" cy="13" r="2" fill="#be185d"/><circle cx="10" cy="14" r="2" fill="#db2777"/><circle cx="14" cy="14" r="2" fill="#db2777"/><circle cx="12" cy="17" r="2" fill="#db2777"/><path d="M12 7v-4" stroke="#22c55e" stroke-width="1"/>`,
  blueberry: `<circle cx="12" cy="14" r="5" fill="#4338ca"/><circle cx="12" cy="14" r="3.5" fill="#6366f1"/><circle cx="12" cy="12" r="1.5" fill="#4338ca" opacity="0.5"/><path d="M10 9l2-3 2 3" fill="#22c55e"/>`,
  currant: `<path d="M12 4v14" stroke="#22c55e" stroke-width="1"/><circle cx="10" cy="10" r="2" fill="#dc2626"/><circle cx="14" cy="12" r="2" fill="#dc2626"/><circle cx="11" cy="14" r="2" fill="#ef4444"/><circle cx="13" cy="16" r="2" fill="#ef4444"/><circle cx="12" cy="8" r="2" fill="#dc2626"/>`,
  gooseberry: `<circle cx="12" cy="13" r="6" fill="#84cc16"/><circle cx="12" cy="13" r="4" fill="#a3e635"/><path d="M8 11l8 4" stroke="#65a30d" stroke-width="0.3"/><path d="M8 15l8-4" stroke="#65a30d" stroke-width="0.3"/><path d="M12 7v-3" stroke="#22c55e" stroke-width="1"/>`,

  // HERBS
  basil: `<path d="M12 22v-10" stroke="#15803d" stroke-width="1.5"/><ellipse cx="9" cy="9" rx="4" ry="3" fill="#22c55e" transform="rotate(-15 9 9)"/><ellipse cx="15" cy="9" rx="4" ry="3" fill="#22c55e" transform="rotate(15 15 9)"/><ellipse cx="12" cy="6" rx="3.5" ry="3" fill="#4ade80"/>`,
  parsley: `<path d="M12 22v-10" stroke="#15803d" stroke-width="1.5"/><path d="M8 9c-2-3 0-6 2-5l2 2 2-2c2-1 4 2 2 5l-4 3z" fill="#22c55e"/><path d="M6 12c-2-2 0-5 2-4l4 3-4 3c-2 1-4-1-2-2z" fill="#16a34a"/>`,
  dill: `<path d="M12 22v-16" stroke="#65a30d" stroke-width="1"/><path d="M12 6l-6-3" stroke="#84cc16" stroke-width="0.7"/><path d="M12 6l6-3" stroke="#84cc16" stroke-width="0.7"/><path d="M12 9l-5-2" stroke="#84cc16" stroke-width="0.7"/><path d="M12 9l5-2" stroke="#84cc16" stroke-width="0.7"/><path d="M12 12l-4-1" stroke="#84cc16" stroke-width="0.7"/><path d="M12 12l4-1" stroke="#84cc16" stroke-width="0.7"/>`,
  chives: `<line x1="8" y1="22" x2="9" y2="6" stroke="#22c55e" stroke-width="1.5"/><line x1="11" y1="22" x2="12" y2="4" stroke="#16a34a" stroke-width="1.5"/><line x1="14" y1="22" x2="15" y2="6" stroke="#22c55e" stroke-width="1.5"/><circle cx="9" cy="5" r="2" fill="#c084fc"/><circle cx="12" cy="3" r="2" fill="#a855f7"/><circle cx="15" cy="5" r="2" fill="#c084fc"/>`,
  mint: `<path d="M12 22v-12" stroke="#15803d" stroke-width="1.5"/><ellipse cx="8" cy="8" rx="4" ry="2.5" fill="#34d399" transform="rotate(-30 8 8)"/><ellipse cx="16" cy="11" rx="4" ry="2.5" fill="#34d399" transform="rotate(30 16 11)"/><ellipse cx="9" cy="14" rx="3.5" ry="2" fill="#6ee7b7" transform="rotate(-20 9 14)"/>`,
  rosemary: `<path d="M12 22v-16" stroke="#65a30d" stroke-width="1.5"/><path d="M12 6l-3 0.5" stroke="none"/>${[4,7,10,13,16].map(y => `<ellipse cx="9" cy="${y}" rx="3" ry="0.8" fill="#6366f1" transform="rotate(-30 9 ${y})"/><ellipse cx="15" cy="${y}" rx="3" ry="0.8" fill="#6366f1" transform="rotate(30 15 ${y})"/>`).join("")}`,
  thyme: `<path d="M12 22v-14" stroke="#92400e" stroke-width="1"/><path d="M12 10l-4 2" stroke="#92400e" stroke-width="0.7"/><path d="M12 10l4 2" stroke="#92400e" stroke-width="0.7"/><path d="M12 14l-3 1.5" stroke="#92400e" stroke-width="0.7"/>${[6,8,10,12,14].map(y => `<ellipse cx="${y<12?9:15}" cy="${y}" rx="1.5" ry="1" fill="#a78bfa"/>`).join("")}<circle cx="10" cy="5" r="1.5" fill="#c084fc"/><circle cx="14" cy="6" r="1.5" fill="#c084fc"/>`,
};

export function PlantIcon({ plantId, size = 24, className = "" }: Props) {
  const svg = PLANT_SVGS[plantId];
  if (!svg) return null;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{
        __html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`,
      }}
    />
  );
}

export function hasPlantSvg(plantId: string): boolean {
  return plantId in PLANT_SVGS;
}
