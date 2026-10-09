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
    <path d="M4.5 18.5C3.5 17.5 4 15.5 6 14L15 6.5C17 5 19 5.5 19.5 7S19 10.5 17 12L8 19C6.5 20 5.5 19.5 4.5 18.5Z" fill="#3f6212"/>
    <path d="M6 16.5L15.5 8.5M7.5 18L17 10" stroke="#65a30d" stroke-width="0.8" stroke-linecap="round" opacity="0.8"/>
    <circle cx="9" cy="14" r="0.4" fill="#a3e635"/><circle cx="13" cy="11" r="0.4" fill="#a3e635"/><circle cx="11" cy="15" r="0.4" fill="#a3e635"/>
    <path d="M18.5 6C19.5 4.5 20.5 4 21.5 4.5" stroke="#4d7c0f" stroke-width="1.3" stroke-linecap="round" fill="none"/>
    <path d="M4.3 18.7C3.8 19.4 3.8 20 4.2 20.2" stroke="#ca8a04" stroke-width="1" stroke-linecap="round" fill="none"/>`,

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
    <path d="M12 8C8 9 5.5 11.5 5.5 15.5C5.5 19 8.5 21 12 21S18.5 19 18.5 15.5C18.5 11.5 16 9 12 8Z" fill="#f5f0e6" stroke="#a8a29e" stroke-width="0.8"/>
    <path d="M12 8.5C10 11 9.5 14 10 20.5M12 8.5C14 11 14.5 14 14 20.5" stroke="#c4b5a5" stroke-width="0.6" fill="none"/>
    <path d="M8 11.5C7 14 7.2 17 8.2 19.5M16 11.5C17 14 16.8 17 15.8 19.5" stroke="#d6cfc4" stroke-width="0.5" fill="none"/>
    <path d="M12 8.5V4" stroke="#65a30d" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M12 4.5C11 3 11.5 2 12.5 2" stroke="#65a30d" stroke-width="1" fill="none" stroke-linecap="round"/>
    <path d="M10.5 21.2L10 22.5M12 21.4V22.8M13.5 21.2L14 22.5" stroke="#a8a29e" stroke-width="0.5" stroke-linecap="round"/>`,

  potato: `
    <ellipse cx="12" cy="13" rx="8" ry="6.5" fill="#92400e" transform="rotate(-8 12 13)"/>
    <ellipse cx="12" cy="13" rx="8" ry="6.5" fill="url(#pg)" transform="rotate(-8 12 13)"/>
    <ellipse cx="12" cy="12.5" rx="6" ry="5" fill="#a16207" transform="rotate(-8 12 13)"/>
    <circle cx="8.5" cy="11" r="0.7" fill="#78350f"/>
    <circle cx="15" cy="14.5" r="0.7" fill="#78350f"/>
    <circle cx="11" cy="15.5" r="0.5" fill="#78350f"/>
    <defs><radialGradient id="pg" cx="35%" cy="30%"><stop offset="0%" stop-color="#fff" stop-opacity="0.12"/><stop offset="100%" stop-color="#000" stop-opacity="0.1"/></radialGradient></defs>`,

  kale: `
    <path d="M12 22V14" stroke="#15803d" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M4 10C3 6 6 2 12 2S21 6 20 10C19 14 16 16 12 16S5 14 4 10Z" fill="#166534"/>
    <path d="M6 9Q8 4 12 3Q16 4 18 9Q16 13 12 14Q8 13 6 9Z" fill="#22c55e"/>
    <path d="M5 10C4 9 5 8 6.5 9S6 11 5 10Z" fill="#14532d"/>
    <path d="M19 10C20 9 19 8 17.5 9S18 11 19 10Z" fill="#14532d"/>
    <path d="M7 7C6 6 7 5 8 6Z" fill="#14532d" opacity="0.5"/>
    <path d="M17 7C18 6 17 5 16 6Z" fill="#14532d" opacity="0.5"/>`,

  spinach: `
    <path d="M12 22V12" stroke="#15803d" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M6 9C6 4 9 2 12 2S18 4 18 9C18 13 15 15 12 15S6 13 6 9Z" fill="#15803d"/>
    <path d="M7.5 9C7.5 5 9.5 3 12 3S16.5 5 16.5 9C16.5 12.5 14.5 14 12 14S7.5 12.5 7.5 9Z" fill="#22c55e"/>
    <path d="M12 4V13" stroke="#15803d" stroke-width="0.6"/>
    <path d="M9 6L12 5L15 6" stroke="#15803d" stroke-width="0.4" fill="none"/>
    <path d="M8 9L12 8L16 9" stroke="#15803d" stroke-width="0.4" fill="none"/>`,

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
    <path d="M11 3C9 2 7 3 6 6C8 5 9.5 5.5 10.5 8Z" fill="#15803d"/>
    <path d="M13 3C15 2 17 3 18 6C16 5 14.5 5.5 13.5 8Z" fill="#16a34a"/>
    <path d="M10 13V6C10 4 14 4 14 6V13Z" fill="#22c55e"/>
    <path d="M10 12H14V20C14 21.2 13.1 22 12 22S10 21.2 10 20Z" fill="#f8fafc" stroke="#94a3b8" stroke-width="0.6"/>
    <path d="M10 12H14V14.5H10Z" fill="#bef264"/>
    <path d="M11 22.5L10.5 23.5M12 22.5V23.8M13 22.5L13.5 23.5" stroke="#a8a29e" stroke-width="0.5" stroke-linecap="round"/>`,

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
    <path d="M12 22V12" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>
    <path d="M5 9C5 4 8 1 12 1S19 4 19 9C19 13 16 15 12 15S5 13 5 9Z" fill="#22c55e"/>
    <path d="M7 8Q9 4 12 3Q15 4 17 8Q15 12 12 13Q9 12 7 8Z" fill="#4ade80"/>
    <path d="M12 2V14" stroke="#dc2626" stroke-width="1.2"/>
    <path d="M9 5L12 3.5L15 5" stroke="#dc2626" stroke-width="0.7" fill="none"/>
    <path d="M8 8L12 6.5L16 8" stroke="#dc2626" stroke-width="0.5" fill="none"/>
    <path d="M8 11L12 9.5L16 11" stroke="#dc2626" stroke-width="0.4" fill="none"/>`,

  kohlrabi: `
    <circle cx="12" cy="16" r="5.5" fill="#84cc16"/>
    <circle cx="12" cy="16" r="5.5" fill="url(#kg)"/>
    <circle cx="12" cy="15.5" r="4" fill="#a3e635"/>
    <path d="M10 10C10 7 11 5 12 4S14 7 14 10" fill="#22c55e"/>
    <path d="M7 9C6 7 7 5 8 6L10 9" fill="#4ade80"/>
    <path d="M17 9C18 7 17 5 16 6L14 9" fill="#4ade80"/>
    <defs><radialGradient id="kg" cx="40%" cy="35%"><stop offset="0%" stop-color="#fff" stop-opacity="0.15"/><stop offset="100%" stop-color="#000" stop-opacity="0.1"/></radialGradient></defs>`,

  fennel: `
    <path d="M12 11V4M12 6L8 2.5M12 6L16 2.5M12 8L8.5 5.5M12 8L15.5 5.5" stroke="#4d7c0f" stroke-width="1" stroke-linecap="round"/>
    <path d="M8 3L6.5 2.2M16 3L17.5 2.2M8.5 5.5L7 5M15.5 5.5L17 5" stroke="#65a30d" stroke-width="0.7" stroke-linecap="round"/>
    <path d="M10 11.5C7 13 6 16 7.5 19C8.8 21.5 15.2 21.5 16.5 19C18 16 17 13 14 11.5Z" fill="#ecfccb" stroke="#84a33a" stroke-width="0.8"/>
    <path d="M12 11.5C10 14 10 18 11 21M12 11.5C14 14 14 18 13 21" stroke="#a3c45a" stroke-width="0.6" fill="none"/>`,

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
    <path d="M12 21C6.5 21 3.5 17.5 4 13.5C4.5 9.5 7.5 6.5 12 6.5S19.5 9.5 20 13.5C20.5 17.5 17.5 21 12 21Z" fill="#a3e635"/>
    <path d="M12 19C8.5 19 6.5 16.5 7 13.5C7.5 10.5 9.5 9 12 9S16.5 10.5 17 13.5C17.5 16.5 15.5 19 12 19Z" fill="#d9f99d"/>
    <path d="M4 13.5C3 10 5 6 8.5 5C7.5 7.5 7.5 10 9 12.5C7 12 5.5 12.5 4 13.5Z" fill="#65a30d"/>
    <path d="M20 13.5C21 10 19 6 15.5 5C16.5 7.5 16.5 10 15 12.5C17 12 18.5 12.5 20 13.5Z" fill="#4d7c0f"/>
    <path d="M12 9V19M12 13L9 11M12 13L15 11M12 16L8.5 14.5M12 16L15.5 14.5" stroke="#84cc16" stroke-width="0.6" fill="none"/>`,

  broccoli: `
    <path d="M11 15H13V22" stroke="#15803d" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="7.5" cy="12" r="3.5" fill="#16a34a"/>
    <circle cx="12" cy="9.5" r="4" fill="#22c55e"/>
    <circle cx="16.5" cy="12" r="3.5" fill="#16a34a"/>
    <circle cx="9.5" cy="9" r="2.5" fill="#4ade80"/>
    <circle cx="14.5" cy="9" r="2.5" fill="#4ade80"/>
    <circle cx="12" cy="7" r="2" fill="#86efac"/>`,

  cauliflower: `
    <path d="M4 14C3 17 6 21 12 21S21 17 20 14C17 16 7 16 4 14Z" fill="#16a34a"/>
    <path d="M5 13.5C3.5 10 6 9 7.5 10.5C7.5 7.5 10.5 6.5 12 8C13.5 6.5 16.5 7.5 16.5 10.5C18 9 20.5 10 19 13.5C16 16 8 16 5 13.5Z" fill="#fef9e7" stroke="#d6b26e" stroke-width="0.7"/>
    <circle cx="9" cy="11.5" r="1.1" fill="#f5e6c4"/>
    <circle cx="12" cy="10.5" r="1.1" fill="#f5e6c4"/>
    <circle cx="15" cy="11.5" r="1.1" fill="#f5e6c4"/>
    <circle cx="10.5" cy="13.3" r="1" fill="#f5e6c4"/>
    <circle cx="13.5" cy="13.3" r="1" fill="#f5e6c4"/>
    <path d="M4 14C6 17 9 18 10 21M20 14C18 17 15 18 14 21" stroke="#15803d" stroke-width="0.6" fill="none"/>`,

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
    <path d="M12 22V12" stroke="#15803d" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="8" cy="10" rx="5" ry="3.5" fill="#22c55e" transform="rotate(-15 8 10)"/>
    <ellipse cx="16" cy="10" rx="5" ry="3.5" fill="#22c55e" transform="rotate(15 16 10)"/>
    <ellipse cx="12" cy="6" rx="5" ry="4" fill="#4ade80"/>
    <path d="M12 6V3" stroke="#15803d" stroke-width="0.5"/>
    <path d="M8 10L5 10" stroke="#15803d" stroke-width="0.5"/>
    <path d="M16 10L19 10" stroke="#15803d" stroke-width="0.5"/>
    <ellipse cx="12" cy="5" rx="2.5" ry="1.5" fill="#86efac" opacity="0.5"/>`,

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
    <path d="M12 22V8" stroke="#059669" stroke-width="2" stroke-linecap="round"/>
    <path d="M12 8L7 5C5 6 4 4 6 3L12 6Z" fill="#34d399"/>
    <path d="M12 12L17 9C19 10 20 8 18 7L12 10Z" fill="#34d399"/>
    <path d="M12 16L7 13C5 14 4 12 6 11L12 14Z" fill="#6ee7b7"/>
    <circle cx="7" cy="4" r="0.8" fill="#34d399"/>
    <circle cx="17" cy="8" r="0.8" fill="#34d399"/>
    <circle cx="7" cy="12" r="0.8" fill="#6ee7b7"/>`,

  rosemary: `
    <path d="M12 22V3" stroke="#65a30d" stroke-width="2" stroke-linecap="round"/>
    ${[4,6.5,9,11.5,14,16.5].map(y => `
      <path d="M12 ${y}L${y < 10 ? 7 : 8} ${y - 1}" stroke="#059669" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M12 ${y}L${y < 10 ? 17 : 16} ${y - 1}" stroke="#059669" stroke-width="1.5" stroke-linecap="round"/>
    `).join("")}
    <circle cx="12" cy="2.5" r="1" fill="#4ade80"/>`,

  thyme: `
    <path d="M12 22V5" stroke="#92400e" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M12 9L7 11" stroke="#92400e" stroke-width="1"/>
    <path d="M12 9L17 11" stroke="#92400e" stroke-width="1"/>
    <path d="M12 13L8 15" stroke="#92400e" stroke-width="1"/>
    <path d="M12 13L16 15" stroke="#92400e" stroke-width="1"/>
    <circle cx="7" cy="10.5" r="1.5" fill="#22c55e"/>
    <circle cx="17" cy="10.5" r="1.5" fill="#22c55e"/>
    <circle cx="8" cy="14.5" r="1.5" fill="#22c55e"/>
    <circle cx="16" cy="14.5" r="1.5" fill="#22c55e"/>
    <circle cx="10" cy="4" r="2" fill="#c084fc"/>
    <circle cx="14" cy="3.5" r="2" fill="#a855f7"/>
    <circle cx="12" cy="5.5" r="1.5" fill="#d8b4fe"/>`,

  // ── NEW VEGETABLES ──

  eggplant: `
    <ellipse cx="12" cy="14" rx="5" ry="7" fill="#581c87"/>
    <ellipse cx="12" cy="14" rx="5" ry="7" fill="url(#epg)"/>
    <ellipse cx="12" cy="13" rx="3.5" ry="5.5" fill="#7c3aed"/>
    <ellipse cx="10.5" cy="11" rx="1.5" ry="2" fill="#fff" opacity="0.08"/>
    <path d="M9 7C9 5 10 4 12 4S15 5 15 7" fill="#22c55e"/>
    <path d="M12 4V2" stroke="#16a34a" stroke-width="1.5" stroke-linecap="round"/>
    <defs><radialGradient id="epg" cx="35%" cy="30%"><stop offset="0%" stop-color="#fff" stop-opacity="0.12"/><stop offset="100%" stop-color="#000" stop-opacity="0.18"/></radialGradient></defs>`,

  arugula: `
    <path d="M12 22V12" stroke="#15803d" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M12 12L7 8C5 10 4 7 6 5L12 8" fill="#22c55e"/>
    <path d="M12 12L17 8C19 10 20 7 18 5L12 8" fill="#22c55e"/>
    <path d="M12 9L8 4C6 5 5 3 7 2L12 5" fill="#4ade80"/>
    <path d="M12 9L16 4C18 5 19 3 17 2L12 5" fill="#4ade80"/>
    <path d="M12 6L10 1C11 0 13 0 14 1L12 6" fill="#86efac"/>`,

  squash: `
    <ellipse cx="12" cy="13" rx="5" ry="8" fill="#c2956b" transform="rotate(-10 12 13)"/>
    <ellipse cx="12" cy="13" rx="5" ry="8" fill="url(#sqg)" transform="rotate(-10 12 13)"/>
    <ellipse cx="12" cy="12.5" rx="3.5" ry="6.5" fill="#d2b48c" transform="rotate(-10 12 13)"/>
    <path d="M12 5V3" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M12 3.5C11 2 11.5 1 12.5 1.5S13 3 12 3.5" fill="#22c55e"/>
    <path d="M9 8L15 8" stroke="#a0845c" stroke-width="0.4" opacity="0.4"/>
    <path d="M8.5 13L15.5 13" stroke="#a0845c" stroke-width="0.4" opacity="0.4"/>
    <defs><radialGradient id="sqg" cx="35%" cy="30%"><stop offset="0%" stop-color="#fff" stop-opacity="0.15"/><stop offset="100%" stop-color="#000" stop-opacity="0.1"/></radialGradient></defs>`,

  asparagus: `
    <path d="M7 22L7.5 8" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M12 22L12 5" stroke="#16a34a" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M17 22L16.5 9" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M12 5C12 3 11.5 2 12 1.5S13 3 12 5" fill="#4ade80"/>
    <path d="M7.5 8C7 6 7 5 7.5 4.5S8.5 6 7.5 8" fill="#86efac"/>
    <path d="M16.5 9C16 7 16 6 16.5 5.5S17.5 7 16.5 9" fill="#86efac"/>
    <path d="M10 8L12 7" stroke="#15803d" stroke-width="0.5"/><path d="M14 9L12 8" stroke="#15803d" stroke-width="0.5"/>`,

  pak_choi: `
    <path d="M8 22C8 22 8.5 16 9 13C9.5 10 10 8 10 8" stroke="#86a98f" stroke-width="3.8" stroke-linecap="round" fill="none"/>
    <path d="M16 22C16 22 15.5 16 15 13C14.5 10 14 8 14 8" stroke="#86a98f" stroke-width="3.8" stroke-linecap="round" fill="none"/>
    <path d="M12 22C12 22 12 16 12 13V9" stroke="#86a98f" stroke-width="3.3" stroke-linecap="round" fill="none"/>
    <path d="M8 22C8 22 8.5 16 9 13C9.5 10 10 8 10 8" stroke="#f0fdf4" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <path d="M16 22C16 22 15.5 16 15 13C14.5 10 14 8 14 8" stroke="#f0fdf4" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <path d="M12 22C12 22 12 16 12 13V9" stroke="#ecfdf5" stroke-width="2.1" stroke-linecap="round" fill="none"/>
    <path d="M6 7C6 3 9 1 12 1S18 3 18 7C18 10 15 12 12 12S6 10 6 7Z" fill="#22c55e"/>
    <path d="M8 7C8 4 10 2 12 2S16 4 16 7C16 9 14 11 12 11S8 9 8 7Z" fill="#4ade80"/>
    <path d="M12 3V10" stroke="#15803d" stroke-width="0.5"/>`,

  endive: `
    <path d="M12 22V13" stroke="#65a30d" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M5 10C5 5 8 2 12 2S19 5 19 10C19 14 16 16 12 16S5 14 5 10Z" fill="#bef264"/>
    <path d="M7 9C8 5 10 3 12 3S16 5 17 9C17 12 15 14 12 14S7 12 7 9Z" fill="#d9f99d"/>
    <path d="M6 11Q9 8 12 8T18 11" stroke="#84cc16" stroke-width="0.5" fill="none" opacity="0.5"/>
    <path d="M7 13Q10 10 12 10T17 13" stroke="#84cc16" stroke-width="0.4" fill="none" opacity="0.4"/>
    <path d="M8 9Q10 6 12 6T16 9" stroke="#84cc16" stroke-width="0.4" fill="none" opacity="0.4"/>`,

  // Feldsalat: a low rosette of spoon-shaped leaves.
  lambs_lettuce: `
    <ellipse cx="12" cy="8" rx="3" ry="5.5" fill="#3f6212" transform="rotate(-150 12 14)"/>
    <ellipse cx="12" cy="8" rx="3" ry="5.5" fill="#3f6212" transform="rotate(150 12 14)"/>
    <ellipse cx="12" cy="8" rx="3" ry="5.5" fill="#4d7c0f" transform="rotate(-80 12 14)"/>
    <ellipse cx="12" cy="8" rx="3" ry="5.5" fill="#4d7c0f" transform="rotate(80 12 14)"/>
    <ellipse cx="12" cy="8" rx="3" ry="5.5" fill="#65a30d" transform="rotate(-28 12 14)"/>
    <ellipse cx="12" cy="8" rx="3" ry="5.5" fill="#65a30d" transform="rotate(28 12 14)"/>
    <path d="M12 14L9.2 8.8M12 14L14.8 8.8M12 14L6.6 13M12 14L17.4 13" stroke="#365314" stroke-width="0.5" stroke-linecap="round" opacity="0.6"/>
    <circle cx="12" cy="14" r="1.6" fill="#84cc16"/>`,

  // Winterportulak: fleshy spoon leaves below, round leaf discs pierced by the flower stalk.
  winter_purslane: `
    <path d="M12 22V8M12 22L7 10M12 22L17 10" stroke="#4d7c0f" stroke-width="1.1" stroke-linecap="round"/>
    <ellipse cx="7.5" cy="19" rx="3.2" ry="1.6" fill="#65a30d" transform="rotate(-25 7.5 19)"/>
    <ellipse cx="16.5" cy="19" rx="3.2" ry="1.6" fill="#65a30d" transform="rotate(25 16.5 19)"/>
    <ellipse cx="7" cy="11" rx="3.4" ry="2.4" fill="#4d7c0f"/>
    <ellipse cx="17" cy="11" rx="3.4" ry="2.4" fill="#4d7c0f"/>
    <ellipse cx="12" cy="9" rx="4" ry="2.8" fill="#65a30d"/>
    <ellipse cx="12" cy="8.6" rx="2.6" ry="1.6" fill="#84cc16" opacity="0.5"/>
    <path d="M7 11V7.5M17 11V7.5M12 9V4.5" stroke="#4d7c0f" stroke-width="0.8" stroke-linecap="round"/>
    <circle cx="7" cy="7" r="1.1" fill="#ffffff" stroke="#d4d4d8" stroke-width="0.3"/>
    <circle cx="17" cy="7" r="1.1" fill="#ffffff" stroke="#d4d4d8" stroke-width="0.3"/>
    <circle cx="12" cy="4" r="1.2" fill="#ffffff" stroke="#d4d4d8" stroke-width="0.3"/>`,
};

import { memo, useId, useMemo } from "react";

// Cache the wrapped SVG markup per plant and size (built once).
const svgCache = new Map<string, { html: string; hasIds: boolean }>();

function getSvgHtml(plantId: string, size: number) {
  const svg = PLANT_SVGS[plantId];
  if (!svg) return null;
  const key = `${plantId}-${size}`;
  let cached = svgCache.get(key);
  if (!cached) {
    cached = {
      html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`,
      hasIds: svg.includes('id="'),
    };
    svgCache.set(key, cached);
  }
  return cached;
}

/**
 * Gradient ids ("pg", "tg" …) must be unique in the document: with the same id
 * in every instance, all icons resolve url(#pg) to the first one, and if that
 * one sits in a hidden container the gradient disappears everywhere. Icons
 * with ids get a per-instance prefix; the others use the cached string as is.
 */
function scopeIds(html: string, scope: string): string {
  return html.replace(/id="([^"]+)"/g, `id="${scope}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${scope}$1)`);
}

export const PlantIcon = memo(function PlantIcon({ plantId, size = 24, className = "" }: Props) {
  const scope = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const html = useMemo(() => {
    const svg = getSvgHtml(plantId, size);
    if (!svg) return null;
    return svg.hasIds ? scopeIds(svg.html, `pi${scope}-`) : svg.html;
  }, [plantId, size, scope]);
  if (!html) return null;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

export function hasPlantSvg(plantId: string): boolean {
  return plantId in PLANT_SVGS;
}
