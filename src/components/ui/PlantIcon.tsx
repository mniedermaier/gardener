interface Props {
  plantId: string;
  size?: number;
  className?: string;
}

// Polished 24x24 SVG icons - each plant distinctly recognizable
const PLANT_SVGS: Record<string, string> = {

  // ── VEGETABLES ──

  tomato: `
    <circle cx="12" cy="14" r="7.5" fill="#dc2626"/>
    <circle cx="12" cy="14" r="7.5" fill="url(#tg)"/>
    <ellipse cx="10" cy="11" rx="3" ry="2" fill="#fff" opacity="0.15"/>
    <path d="M9 7.5Q12 6 15 7.5" stroke="#16a34a" stroke-width="1.2" fill="none"/>
    <path d="M12 7.5V5" stroke="#16a34a" stroke-width="1.3"/>
    <path d="M11 5.5C10 3.5 11 2 12 2s2 1.5 1 3.5" fill="#22c55e"/>
    <defs><radialGradient id="tg" cx="40%" cy="35%"><stop offset="0%" stop-color="#fff" stop-opacity="0.2"/><stop offset="100%" stop-color="#000" stop-opacity="0.15"/></radialGradient></defs>`,

  zucchini: `
    <rect x="6" y="8" width="12" height="10" rx="5" fill="#4d7c0f" transform="rotate(-25 12 13)"/>
    <rect x="7" y="9" width="10" height="8" rx="4" fill="#65a30d" transform="rotate(-25 12 13)"/>
    <ellipse cx="8" cy="10" rx="1.5" ry="1" fill="#84cc16" transform="rotate(-25 8 10)"/>
    <circle cx="17" cy="9" r="1.5" fill="#a3e635" opacity="0.4"/>
    <path d="M17 8c1-1.5 2.5-1.5 2.5-0.5s-1 1.5-2 1.5" fill="#22c55e"/>`,

  carrot: `
    <path d="M12 3L7.5 21Q12 23 16.5 21Z" fill="#ea580c"/>
    <path d="M12 3L8.5 21Q12 22 15.5 21Z" fill="#f97316"/>
    <path d="M9.5 9L14.5 9.5" stroke="#c2410c" stroke-width="0.4" opacity="0.5"/>
    <path d="M9 13L15 13.5" stroke="#c2410c" stroke-width="0.4" opacity="0.5"/>
    <path d="M10 17L14 17" stroke="#c2410c" stroke-width="0.4" opacity="0.5"/>
    <path d="M11 3C9 1 10 0 12 0s3 1 1 3" fill="#22c55e"/>
    <path d="M13 3C14 1.5 15.5 1 15 2.5S13 4 13 3" fill="#16a34a"/>`,

  lettuce: `
    <ellipse cx="12" cy="14" rx="9" ry="7" fill="#65a30d"/>
    <ellipse cx="12" cy="13.5" rx="7.5" ry="6" fill="#84cc16"/>
    <ellipse cx="12" cy="13" rx="5.5" ry="4.5" fill="#a3e635"/>
    <ellipse cx="12" cy="12.5" rx="3.5" ry="3" fill="#bef264"/>
    <path d="M7 11Q12 8 17 11" stroke="#4d7c0f" stroke-width="0.4" fill="none" opacity="0.4"/>`,

  bean: `
    <path d="M8 20C8 12 10 6 12 4C14 6 16 12 16 20Q12 22 8 20Z" fill="#15803d"/>
    <path d="M9 19C9 13 10.5 7.5 12 5.5C13.5 7.5 15 13 15 19Q12 21 9 19Z" fill="#22c55e"/>
    <path d="M12 7V18" stroke="#166534" stroke-width="0.6" opacity="0.5"/>`,

  pea: `
    <path d="M4 12Q4 7 12 7Q20 7 20 12Q20 17 12 17Q4 17 4 12Z" fill="#16a34a"/>
    <path d="M5 12Q5 8 12 8Q19 8 19 12Q19 16 12 16Q5 16 5 12Z" fill="#22c55e"/>
    <circle cx="8.5" cy="12" r="2.8" fill="#15803d"/>
    <circle cx="12" cy="12" r="2.8" fill="#15803d"/>
    <circle cx="15.5" cy="12" r="2.8" fill="#15803d"/>
    <circle cx="8.5" cy="11.3" r="1" fill="#22c55e" opacity="0.3"/>
    <circle cx="12" cy="11.3" r="1" fill="#22c55e" opacity="0.3"/>
    <circle cx="15.5" cy="11.3" r="1" fill="#22c55e" opacity="0.3"/>`,

  radish: `
    <ellipse cx="12" cy="11" rx="5.5" ry="6" fill="#e11d48"/>
    <ellipse cx="12" cy="11" rx="5.5" ry="6" fill="url(#rg)"/>
    <ellipse cx="12" cy="16" rx="1.5" ry="4" fill="#fda4af"/>
    <path d="M10 4C10 2 11 1 12 1S14 2 14 4V7H10Z" fill="#22c55e"/>
    <path d="M8 5C7 3 8 2 9 3L10 5" fill="#4ade80"/>
    <defs><radialGradient id="rg" cx="35%" cy="30%"><stop offset="0%" stop-color="#fff" stop-opacity="0.25"/><stop offset="100%" stop-color="#000" stop-opacity="0.1"/></radialGradient></defs>`,

  cucumber: `
    <rect x="7" y="4" width="10" height="17" rx="5" fill="#15803d"/>
    <rect x="8" y="5" width="8" height="15" rx="4" fill="#22c55e"/>
    <circle cx="10.5" cy="8" r="0.5" fill="#15803d" opacity="0.4"/>
    <circle cx="13" cy="11" r="0.5" fill="#15803d" opacity="0.4"/>
    <circle cx="11" cy="14" r="0.5" fill="#15803d" opacity="0.4"/>
    <circle cx="13.5" cy="17" r="0.5" fill="#15803d" opacity="0.4"/>
    <ellipse cx="10" cy="6" rx="2" ry="1" fill="#4ade80" opacity="0.3"/>`,

  pepper: `
    <path d="M8.5 9C8.5 6 10 4 12 4S15.5 6 15.5 9V17C15.5 19.5 14 21 12 21S8.5 19.5 8.5 17Z" fill="#dc2626"/>
    <path d="M9.5 9C9.5 6.5 10.5 5 12 5S14.5 6.5 14.5 9V16C14.5 18.5 13.5 20 12 20S9.5 18.5 9.5 16Z" fill="#ef4444"/>
    <ellipse cx="10.5" cy="8" rx="1.5" ry="2.5" fill="#fff" opacity="0.12"/>
    <path d="M12 4V1.5" stroke="#16a34a" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M12 2C11 1 11.5 0 12 0S13 1 12 2" fill="#22c55e"/>`,

  onion: `
    <ellipse cx="12" cy="15" rx="7" ry="6.5" fill="#b45309"/>
    <ellipse cx="12" cy="15" rx="7" ry="6.5" fill="url(#og)"/>
    <ellipse cx="12" cy="14.5" rx="5" ry="5" fill="#d97706"/>
    <path d="M12 8.5V4" stroke="#22c55e" stroke-width="1.2"/>
    <path d="M10.5 5.5L12 3.5L13.5 5.5" stroke="#22c55e" stroke-width="1" fill="none"/>
    <path d="M9 6L12 3L15 6" stroke="#4ade80" stroke-width="0.6" fill="none"/>
    <defs><radialGradient id="og" cx="40%" cy="35%"><stop offset="0%" stop-color="#fff" stop-opacity="0.15"/><stop offset="100%" stop-color="#000" stop-opacity="0.12"/></radialGradient></defs>`,

  garlic: `
    <ellipse cx="12" cy="15" rx="6.5" ry="6" fill="#fef3c7"/>
    <path d="M7 15C7 10 9 9 12 8.5C15 9 17 10 17 15" fill="#fde68a"/>
    <path d="M12 9V15" stroke="#e5e7eb" stroke-width="0.5"/>
    <path d="M9 10V15" stroke="#e5e7eb" stroke-width="0.3"/>
    <path d="M15 10V15" stroke="#e5e7eb" stroke-width="0.3"/>
    <path d="M12 8.5V5" stroke="#a3e635" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M12 5C11.5 4 12 3 12.5 3S13 4 12 5" fill="#22c55e"/>`,

  potato: `
    <ellipse cx="12" cy="13" rx="8" ry="6.5" fill="#92400e" transform="rotate(-8 12 13)"/>
    <ellipse cx="12" cy="13" rx="8" ry="6.5" fill="url(#pg)" transform="rotate(-8 12 13)"/>
    <ellipse cx="12" cy="12.5" rx="6" ry="5" fill="#a16207" transform="rotate(-8 12 13)"/>
    <circle cx="8.5" cy="11" r="0.7" fill="#78350f"/>
    <circle cx="15" cy="14.5" r="0.7" fill="#78350f"/>
    <circle cx="11" cy="15.5" r="0.5" fill="#78350f"/>
    <defs><radialGradient id="pg" cx="35%" cy="30%"><stop offset="0%" stop-color="#fff" stop-opacity="0.12"/><stop offset="100%" stop-color="#000" stop-opacity="0.1"/></radialGradient></defs>`,

  kale: `
    <path d="M12 22V13" stroke="#15803d" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M5 10C5 5 8 2 12 2S19 5 19 10C19 14 16 16 12 16S5 14 5 10Z" fill="#166534"/>
    <path d="M7 9C8 5 9.5 3 12 3S16 5 17 9C17 12 15 14 12 14S7 12 7 9Z" fill="#22c55e"/>
    <path d="M6.5 10Q9 7 12 7T17.5 10" stroke="#14532d" stroke-width="0.6" fill="none" opacity="0.4"/>
    <path d="M8 12Q10 9 12 9T16 12" stroke="#14532d" stroke-width="0.4" fill="none" opacity="0.3"/>`,

  spinach: `
    <path d="M12 22V12" stroke="#15803d" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M6 9C6 4 9 2 12 2S18 4 18 9C18 13 15 15 12 15S6 13 6 9Z" fill="#166534"/>
    <path d="M7.5 9C7.5 5 9.5 3 12 3S16.5 5 16.5 9C16.5 12.5 14.5 14 12 14S7.5 12.5 7.5 9Z" fill="#14532d"/>
    <path d="M12 4V13" stroke="#0f4a1a" stroke-width="0.6"/>
    <path d="M9 6L12 5L15 6" stroke="#0f4a1a" stroke-width="0.4" fill="none"/>
    <path d="M8 9L12 8L16 9" stroke="#0f4a1a" stroke-width="0.4" fill="none"/>`,

  beetroot: `
    <circle cx="12" cy="13" r="7" fill="#881337"/>
    <circle cx="12" cy="13" r="7" fill="url(#bg)"/>
    <circle cx="12" cy="12.5" r="5" fill="#9f1239"/>
    <path d="M12 20L12 23" stroke="#be185d" stroke-width="1.2"/>
    <path d="M10.5 20L10 22" stroke="#be185d" stroke-width="0.6"/>
    <path d="M10 4C10 2 11 1 12 1S14 2 14 4V7H10Z" fill="#22c55e"/>
    <path d="M8 5.5C7 4 8 3 9 3.5L10 5.5" fill="#4ade80"/>
    <defs><radialGradient id="bg" cx="35%" cy="30%"><stop offset="0%" stop-color="#fff" stop-opacity="0.15"/><stop offset="100%" stop-color="#000" stop-opacity="0.12"/></radialGradient></defs>`,

  leek: `
    <path d="M10 22H14V12C14 12 14.5 8 14 4C13 4 11 4 10 4C9.5 8 10 12 10 12Z" fill="#f0fdf4"/>
    <path d="M10 22H14V16H10Z" fill="#22c55e"/>
    <path d="M9 4C8 2 9 1 10 2L10 4Z" fill="#4ade80"/>
    <path d="M15 4C16 2 15 1 14 2L14 4Z" fill="#4ade80"/>
    <path d="M8 3C6.5 1 8 0 9.5 1L10 3" fill="#86efac"/>`,

  pumpkin: `
    <circle cx="12" cy="14" r="8" fill="#c2410c"/>
    <circle cx="12" cy="14" r="8" fill="url(#pug)"/>
    <path d="M12 6C6 8 5 14 6 18" stroke="#9a3412" stroke-width="1" fill="none"/>
    <path d="M12 6C18 8 19 14 18 18" stroke="#9a3412" stroke-width="1" fill="none"/>
    <ellipse cx="12" cy="14" rx="3.5" ry="7.5" fill="#ea580c"/>
    <path d="M12 6V3.5" stroke="#15803d" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M12 4C13 3 14 3.5 13.5 4.5" fill="#22c55e"/>
    <path d="M12 3.5C10.5 2 10 3 10.5 4" fill="#22c55e"/>
    <defs><radialGradient id="pug" cx="40%" cy="35%"><stop offset="0%" stop-color="#fff" stop-opacity="0.1"/><stop offset="100%" stop-color="#000" stop-opacity="0.15"/></radialGradient></defs>`,

  chard: `
    <path d="M12 22V10" stroke="#dc2626" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M6 8C6 3 9 1 12 1S18 3 18 8C18 12 15 14 12 14S6 12 6 8Z" fill="#22c55e"/>
    <path d="M12 2V13" stroke="#dc2626" stroke-width="0.8"/>
    <path d="M9 4L12 3L15 4" stroke="#dc2626" stroke-width="0.5" fill="none"/>
    <path d="M8 7L12 6L16 7" stroke="#dc2626" stroke-width="0.4" fill="none"/>`,

  kohlrabi: `
    <circle cx="12" cy="16" r="5.5" fill="#84cc16"/>
    <circle cx="12" cy="16" r="5.5" fill="url(#kg)"/>
    <circle cx="12" cy="15.5" r="4" fill="#a3e635"/>
    <path d="M10 10C10 7 11 5 12 4S14 7 14 10" fill="#22c55e"/>
    <path d="M7 9C6 7 7 5 8 6L10 9" fill="#4ade80"/>
    <path d="M17 9C18 7 17 5 16 6L14 9" fill="#4ade80"/>
    <defs><radialGradient id="kg" cx="40%" cy="35%"><stop offset="0%" stop-color="#fff" stop-opacity="0.15"/><stop offset="100%" stop-color="#000" stop-opacity="0.1"/></radialGradient></defs>`,

  fennel: `
    <ellipse cx="12" cy="17" rx="4" ry="5" fill="#fef9c3"/>
    <ellipse cx="12" cy="16.5" rx="3" ry="4" fill="#fef3c7"/>
    <path d="M12 12V5" stroke="#65a30d" stroke-width="1.2"/>
    <path d="M12 5L7 2" stroke="#84cc16" stroke-width="0.8"/><path d="M12 5L17 2" stroke="#84cc16" stroke-width="0.8"/>
    <path d="M12 7L8 4.5" stroke="#84cc16" stroke-width="0.6"/><path d="M12 7L16 4.5" stroke="#84cc16" stroke-width="0.6"/>
    <path d="M12 9L9 7" stroke="#84cc16" stroke-width="0.5"/><path d="M12 9L15 7" stroke="#84cc16" stroke-width="0.5"/>`,

  corn: `
    <path d="M9 5H15V19C15 20 14 21 12 21S9 20 9 19Z" fill="#ca8a04"/>
    <path d="M10 6H14V18C14 19 13 20 12 20S10 19 10 18Z" fill="#eab308"/>
    <circle cx="11" cy="8" r="0.8" fill="#fde68a"/><circle cx="13" cy="8" r="0.8" fill="#fde68a"/>
    <circle cx="11" cy="11" r="0.8" fill="#fde68a"/><circle cx="13" cy="11" r="0.8" fill="#fde68a"/>
    <circle cx="11" cy="14" r="0.8" fill="#fde68a"/><circle cx="13" cy="14" r="0.8" fill="#fde68a"/>
    <circle cx="11" cy="17" r="0.8" fill="#fde68a"/><circle cx="13" cy="17" r="0.8" fill="#fde68a"/>
    <path d="M9 5C7 3 6 1 7 0" stroke="#22c55e" stroke-width="1.2" fill="none"/>
    <path d="M15 5C17 3 18 1 17 0" stroke="#22c55e" stroke-width="1.2" fill="none"/>`,

  sunflower: `
    <circle cx="12" cy="12" r="3.5" fill="#78350f"/>
    <circle cx="12" cy="12" r="2.5" fill="#92400e"/>
    <circle cx="12" cy="11" r="1" fill="#a16207" opacity="0.4"/>
    ${[0,30,60,90,120,150,180,210,240,270,300,330].map(a => `<ellipse cx="12" cy="5" rx="1.8" ry="2.8" fill="#eab308" transform="rotate(${a} 12 12)"/>`).join("")}
    ${[15,45,75,105,135,165,195,225,255,285,315,345].map(a => `<ellipse cx="12" cy="5.5" rx="1.5" ry="2.3" fill="#fbbf24" transform="rotate(${a} 12 12)"/>`).join("")}`,

  cabbage: `
    <circle cx="12" cy="14" r="8" fill="#4ade80"/>
    <circle cx="12" cy="13.5" r="6.5" fill="#22c55e"/>
    <circle cx="12" cy="13" r="5" fill="#16a34a"/>
    <circle cx="12" cy="12.5" r="3" fill="#86efac"/>
    <circle cx="12" cy="12" r="1.5" fill="#bbf7d0"/>
    <path d="M6.5 11Q12 8 17.5 11" stroke="#15803d" stroke-width="0.4" fill="none" opacity="0.4"/>`,

  broccoli: `
    <path d="M11 15H13V22" stroke="#15803d" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="7.5" cy="12" r="3.5" fill="#16a34a"/>
    <circle cx="12" cy="9.5" r="4" fill="#22c55e"/>
    <circle cx="16.5" cy="12" r="3.5" fill="#16a34a"/>
    <circle cx="9.5" cy="9" r="2.5" fill="#4ade80"/>
    <circle cx="14.5" cy="9" r="2.5" fill="#4ade80"/>
    <circle cx="12" cy="7" r="2" fill="#86efac"/>`,

  cauliflower: `
    <path d="M11 16H13V22" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="8" cy="13" r="3.5" fill="#fef3c7"/>
    <circle cx="12" cy="10.5" r="4" fill="#fffbeb"/>
    <circle cx="16" cy="13" r="3.5" fill="#fef3c7"/>
    <circle cx="10" cy="10" r="2.5" fill="#fff"/>
    <circle cx="14" cy="10" r="2.5" fill="#fff"/>
    <circle cx="12" cy="8" r="2" fill="#fefce8"/>
    <path d="M7 14C5 14 5 12 6.5 11" stroke="#22c55e" stroke-width="0.8" fill="none"/>`,

  celery: `
    <path d="M10 22C10 22 10 14 10.5 10C11 6 11 3 11 3" stroke="#84cc16" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <path d="M14 22C14 22 14 14 13.5 10C13 6 13 3 13 3" stroke="#a3e635" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <path d="M11 3C9.5 1 10 0 11 1" fill="#22c55e"/>
    <path d="M13 3C14.5 1 14 0 13 1" fill="#22c55e"/>`,

  turnip: `
    <ellipse cx="12" cy="14" rx="6.5" ry="6" fill="#ddd6fe"/>
    <ellipse cx="12" cy="14" rx="6.5" ry="6" fill="url(#tug)"/>
    <ellipse cx="12" cy="12" rx="5.5" ry="3" fill="#c084fc"/>
    <path d="M12 20V23" stroke="#d8b4fe" stroke-width="1.2"/>
    <path d="M10.5 20L10 22" stroke="#d8b4fe" stroke-width="0.6"/>
    <path d="M10 5C10 3 11 2 12 2S14 3 14 5V7.5H10Z" fill="#22c55e"/>
    <defs><radialGradient id="tug" cx="40%" cy="30%"><stop offset="0%" stop-color="#fff" stop-opacity="0.2"/><stop offset="100%" stop-color="#000" stop-opacity="0.08"/></radialGradient></defs>`,

  // ── BERRIES ──

  strawberry: `
    <path d="M7.5 10C7.5 6 9.5 4 12 4S16.5 6 16.5 10C16.5 16 14 21 12 21S7.5 16 7.5 10Z" fill="#dc2626"/>
    <path d="M7.5 10C7.5 6 9.5 4 12 4S16.5 6 16.5 10C16.5 16 14 21 12 21S7.5 16 7.5 10Z" fill="url(#sg)"/>
    <circle cx="10" cy="10" r="0.5" fill="#fecaca"/><circle cx="14" cy="11" r="0.5" fill="#fecaca"/>
    <circle cx="11.5" cy="14" r="0.5" fill="#fecaca"/><circle cx="13.5" cy="17" r="0.5" fill="#fecaca"/>
    <circle cx="10" cy="16" r="0.5" fill="#fecaca"/><circle cx="14" cy="14.5" r="0.5" fill="#fecaca"/>
    <path d="M10 4C9 2 10 1 12 1S15 2 14 4" fill="#22c55e"/>
    <path d="M8 3C7 1.5 8 1 9.5 2L10 4" fill="#4ade80"/>
    <defs><radialGradient id="sg" cx="35%" cy="25%"><stop offset="0%" stop-color="#fff" stop-opacity="0.2"/><stop offset="100%" stop-color="#000" stop-opacity="0.12"/></radialGradient></defs>`,

  raspberry: `
    <circle cx="10" cy="10.5" r="2.2" fill="#be185d"/>
    <circle cx="14" cy="10.5" r="2.2" fill="#be185d"/>
    <circle cx="12" cy="8.5" r="2.2" fill="#db2777"/>
    <circle cx="12" cy="13" r="2.2" fill="#be185d"/>
    <circle cx="10" cy="15" r="2.2" fill="#db2777"/>
    <circle cx="14" cy="15" r="2.2" fill="#db2777"/>
    <circle cx="12" cy="17" r="2.2" fill="#ec4899"/>
    <path d="M12 6V2.5" stroke="#22c55e" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M12 3C11 2 11.5 1 12 1S13 2 12 3" fill="#22c55e"/>`,

  blueberry: `
    <circle cx="12" cy="14" r="6" fill="#4338ca"/>
    <circle cx="12" cy="14" r="6" fill="url(#blg)"/>
    <circle cx="12" cy="13" r="4.5" fill="#4f46e5"/>
    <path d="M10 9.5L12 8L14 9.5" fill="#22c55e"/>
    <circle cx="12" cy="10.5" r="1.5" fill="#3730a3" opacity="0.5"/>
    <ellipse cx="10.5" cy="12" rx="1.5" ry="1" fill="#fff" opacity="0.1"/>
    <defs><radialGradient id="blg" cx="35%" cy="30%"><stop offset="0%" stop-color="#fff" stop-opacity="0.15"/><stop offset="100%" stop-color="#000" stop-opacity="0.15"/></radialGradient></defs>`,

  currant: `
    <path d="M12 3V18" stroke="#16a34a" stroke-width="1"/>
    <path d="M12 5L9 4" stroke="#22c55e" stroke-width="0.6"/>
    <circle cx="10.5" cy="8" r="2" fill="#dc2626"/><circle cx="10.5" cy="7.5" r="0.7" fill="#fff" opacity="0.2"/>
    <circle cx="13.5" cy="10.5" r="2" fill="#ef4444"/><circle cx="13.5" cy="10" r="0.7" fill="#fff" opacity="0.2"/>
    <circle cx="11" cy="13" r="2" fill="#dc2626"/><circle cx="11" cy="12.5" r="0.7" fill="#fff" opacity="0.2"/>
    <circle cx="13" cy="16" r="2" fill="#ef4444"/><circle cx="13" cy="15.5" r="0.7" fill="#fff" opacity="0.2"/>`,

  gooseberry: `
    <circle cx="12" cy="14" r="6.5" fill="#65a30d"/>
    <circle cx="12" cy="14" r="6.5" fill="url(#gg)"/>
    <circle cx="12" cy="13.5" r="5" fill="#84cc16"/>
    <path d="M7 12L17 16" stroke="#4d7c0f" stroke-width="0.4" opacity="0.5"/>
    <path d="M7 16L17 12" stroke="#4d7c0f" stroke-width="0.4" opacity="0.5"/>
    <path d="M12 8L12 20" stroke="#4d7c0f" stroke-width="0.4" opacity="0.5"/>
    <path d="M12 7.5V4" stroke="#22c55e" stroke-width="1.2" stroke-linecap="round"/>
    <defs><radialGradient id="gg" cx="35%" cy="30%"><stop offset="0%" stop-color="#fff" stop-opacity="0.15"/><stop offset="100%" stop-color="#000" stop-opacity="0.12"/></radialGradient></defs>`,

  // ── HERBS ──

  basil: `
    <path d="M12 22V11" stroke="#15803d" stroke-width="1.8" stroke-linecap="round"/>
    <ellipse cx="8.5" cy="9" rx="4.5" ry="3.5" fill="#22c55e" transform="rotate(-20 8.5 9)"/>
    <ellipse cx="15.5" cy="9" rx="4.5" ry="3.5" fill="#22c55e" transform="rotate(20 15.5 9)"/>
    <ellipse cx="12" cy="5.5" rx="4" ry="3.5" fill="#4ade80"/>
    <path d="M8.5 9L5.5 9.5" stroke="#15803d" stroke-width="0.4"/>
    <path d="M15.5 9L18.5 9.5" stroke="#15803d" stroke-width="0.4"/>
    <path d="M12 5.5V2.5" stroke="#15803d" stroke-width="0.4"/>`,

  parsley: `
    <path d="M12 22V11" stroke="#15803d" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M12 11L8 8C6 6 7 3 9 4L12 7" fill="#22c55e"/>
    <path d="M12 11L16 8C18 6 17 3 15 4L12 7" fill="#22c55e"/>
    <path d="M12 8L9 4C8 2 9 1 11 2L12 4" fill="#4ade80"/>
    <path d="M12 8L15 4C16 2 15 1 13 2L12 4" fill="#4ade80"/>
    <path d="M12 5L12 2" stroke="#22c55e" stroke-width="0.5"/>`,

  dill: `
    <path d="M12 22V5" stroke="#65a30d" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M12 5L6 2" stroke="#84cc16" stroke-width="0.9"/><path d="M12 5L18 2" stroke="#84cc16" stroke-width="0.9"/>
    <path d="M12 7.5L7 5" stroke="#84cc16" stroke-width="0.8"/><path d="M12 7.5L17 5" stroke="#84cc16" stroke-width="0.8"/>
    <path d="M12 10L8 8" stroke="#84cc16" stroke-width="0.7"/><path d="M12 10L16 8" stroke="#84cc16" stroke-width="0.7"/>
    <path d="M12 12.5L9 11" stroke="#84cc16" stroke-width="0.6"/><path d="M12 12.5L15 11" stroke="#84cc16" stroke-width="0.6"/>
    <circle cx="6" cy="2" r="0.7" fill="#a3e635"/><circle cx="18" cy="2" r="0.7" fill="#a3e635"/>
    <circle cx="7" cy="5" r="0.5" fill="#a3e635"/><circle cx="17" cy="5" r="0.5" fill="#a3e635"/>`,

  chives: `
    <path d="M7.5 22L8.5 5" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/>
    <path d="M11.5 22L12 3" stroke="#16a34a" stroke-width="2" stroke-linecap="round"/>
    <path d="M15.5 22L16 5" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="8.5" cy="4" rx="2" ry="2.5" fill="#c084fc"/>
    <ellipse cx="12" cy="2" rx="2" ry="2.5" fill="#a855f7"/>
    <ellipse cx="16" cy="4" rx="2" ry="2.5" fill="#c084fc"/>
    <circle cx="8.5" cy="3" r="0.5" fill="#e9d5ff" opacity="0.4"/>
    <circle cx="12" cy="1" r="0.5" fill="#e9d5ff" opacity="0.4"/>`,

  mint: `
    <path d="M12 22V9" stroke="#15803d" stroke-width="1.8" stroke-linecap="round"/>
    <ellipse cx="7.5" cy="7" rx="4.5" ry="3" fill="#34d399" transform="rotate(-25 7.5 7)"/>
    <ellipse cx="16.5" cy="11" rx="4.5" ry="3" fill="#34d399" transform="rotate(25 16.5 11)"/>
    <ellipse cx="8" cy="14" rx="4" ry="2.5" fill="#6ee7b7" transform="rotate(-15 8 14)"/>
    <path d="M7.5 7L4.5 6.5" stroke="#059669" stroke-width="0.4"/>
    <path d="M16.5 11L19 11.5" stroke="#059669" stroke-width="0.4"/>
    <path d="M8 14L5 14" stroke="#059669" stroke-width="0.4"/>`,

  rosemary: `
    <path d="M12 22V4" stroke="#65a30d" stroke-width="1.8" stroke-linecap="round"/>
    ${[5,7.5,10,12.5,15,17.5].map(y => `
      <ellipse cx="9" cy="${y}" rx="3.2" ry="1" fill="#059669" transform="rotate(-35 9 ${y})"/>
      <ellipse cx="15" cy="${y}" rx="3.2" ry="1" fill="#059669" transform="rotate(35 15 ${y})"/>
    `).join("")}
    <path d="M12 4L11 2" stroke="#22c55e" stroke-width="0.8"/>
    <path d="M12 4L13 2" stroke="#22c55e" stroke-width="0.8"/>`,

  thyme: `
    <path d="M12 22V6" stroke="#78350f" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M12 10L8 12" stroke="#78350f" stroke-width="0.8"/>
    <path d="M12 10L16 12" stroke="#78350f" stroke-width="0.8"/>
    <path d="M12 14L9 16" stroke="#78350f" stroke-width="0.8"/>
    <path d="M12 14L15 16" stroke="#78350f" stroke-width="0.8"/>
    <ellipse cx="8" cy="11.5" rx="1.8" ry="1.2" fill="#059669"/>
    <ellipse cx="16" cy="11.5" rx="1.8" ry="1.2" fill="#059669"/>
    <ellipse cx="9" cy="15.5" rx="1.8" ry="1.2" fill="#059669"/>
    <ellipse cx="15" cy="15.5" rx="1.8" ry="1.2" fill="#059669"/>
    <circle cx="10.5" cy="5" r="1.8" fill="#c084fc"/>
    <circle cx="13.5" cy="4" r="1.8" fill="#a855f7"/>
    <circle cx="12" cy="6.5" r="1.5" fill="#d8b4fe"/>`,
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
