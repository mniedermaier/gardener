# Gardener Design System

Working basis for every UI change. Short on purpose: if something is not
covered here, copy the pattern from the reference page
`src/components/pests/PestTracker.tsx`.

## 1. Rules

1. **No emoji in the UI.** Use Lucide icons for UI meaning and `PlantIconDisplay`
   for plants. Emoji are allowed only in user-entered content.
2. **Colour carries meaning, not decoration.** Use neutral `gray-*` for
   everything, `garden-*` for the brand and primary actions, and semantic tones
   only for status: `positive` (good/done), `warning` (needs attention soon),
   `danger` (error/overdue/conflict, destructive actions), `info` (neutral
   hint). Money, weights and counts stay neutral (`text-gray-900 tabular-nums`).
   Never colour a whole number red or green. Put a `Badge` or trend chip next to it.
3. **Numbers and dates go through `useFormat()`** (`src/lib/format.ts`). Never use
   `toFixed()`, never print raw `yyyy-MM-dd`, never hard-code `"kg"` or `"€"`.
   Store dates as ISO `yyyy-MM-dd` (`todayISO()`).
4. **Plurals go through `count`:** `t("seeds.yearsLeft", { count })`. Never use
   `${n} ${t("…")}`.
5. **Every empty state has an action** (`EmptyState` with a primary `Button`).
6. **Editing uses the same dialog as creating.** Clicking a row opens the dialog
   pre-filled. Delete sits in the dialog footer (`variant="danger-ghost"`,
   left) and in the row's `Menu`.
7. **Destructive actions need a confirmation** (`confirm()` from `useToast`, as
   CLAUDE.md requires). After deleting, show a toast with **Rückgängig** (undo).
   Also offer undo for reversible status changes (resolve, mark done).
8. **No hover-only actions.** Row actions are always visible. Use at least
   `text-gray-500` and an `IconButton` with a `label`.
9. **Forms use primitives only:** `Input`, `Select`, `Textarea`, `Checkbox`,
   `SegmentedControl`. Each one gets a label (lint: `label-has-associated-control`);
   a `SegmentedControl` gets a visible `LABEL_CLASS` caption above it. Dialog rules:
   - **Optional fields** pass `optional` to the primitive (`Input`, `Select`,
     `Textarea`, `DatePicker`, `PlantCombobox`), which appends a muted
     "(optional)". Never write "(optional)" or "optional" into a label or hint;
     required fields stay unmarked.
   - **Units** sit in the label in parentheses: "Kosten (€)", "Menge (l)",
     "Dauer (Min.)", "Ernte ab (Tage)". Placeholders are plain example numbers
     ("z. B. 4,00"), never a currency string. Every numeric field shows such an
     example; where a unit picker sits beside the amount, the label follows it
     ("Gewicht (kg)", "Menge (Päckchen)") — harvest, feed and seeds alike.
   - **Name fields:** "Titel" for records (journal, task, expense), "Name" for
     things you keep or identify (bed, plant, animal, preserve, problem).
   - **Costs** that feed the balance (seeds, pantry supplies, soil, feed, health)
     carry the hint `common.costHint` ("Fließt in die Bilanz unter Kosten ein.").
   - **Numbers** use a text field with `inputMode="decimal"`/`"numeric"`, not
     `type="number"` (no spin arrows, the decimal comma works). Short pairs
     (amount + unit, year + source, amount + category, method + duration) stay
     side by side on phones.
   - **Plant fields** are a `PlantCombobox` labelled "Pflanze" in every dialog.
   - **Scales** (harvest quality, pest severity) show their two endpoint
     captions under the control.
   - **Dates:** `DateField` — Heute/Gestern/Datum … for records,
     `mode="future"` (Heute/Morgen/+1 Woche/Datum …) for tasks; the last
     segment is always "Datum …" with the calendar icon. A native
     `DatePicker` only for one-off dates such as "Im Bestand seit".
   - **Notizen** is an optional `Textarea` with a placeholder that fits the
     record: `common.notesPlaceholder` for crops, otherwise the dialog's own key
     (`livestock.{feed,health,production}.notesPlaceholder`, `calendar.`,
     `water.`, `seeds.`, `pantry.`, `soil.notesPlaceholder`). Where the text is
     the record itself (journal "Beobachtung") it is not marked optional.
   - A full-width `SegmentedControl` never overflows: its segments shrink and
     wrap to two lines; keep labels short so they don't have to.
   - A required choice without an unambiguous default (e.g. the bed when
     watering) starts empty ("Beet wählen …"); prefill only from a deep link,
     the last entry or a single option.
   - Placeholders that list examples end in a typographic ellipsis "…" (German
     with a space before it): "z. B. Aussaat, Frost, Ernte …". A single example
     value needs none: "z. B. Ingwer", "z. B. 4,00".
   - Save stays disabled until the required fields are valid.
10. **No `alert`/`prompt`.** Use a `Modal` or a `toast` instead.
11. Write user-visible strings in all 4 locales. Microcopy has no exclamation
    marks and uses active phrasing ("3 Aufgaben überfällig").

12. **Naming:** the page `h1` is the sidebar label, and a section tab is named
    like the `h1` of its page ("Planer", not "Gartenplaner"; "Ernte", not
    "Ernteprotokoll"). The first tab of a section repeats the section name.
13. **One verb per concept** (all four locales):

    | Concept | de | en | es | fr |
    |---|---|---|---|---|
    | record something that happened (harvest, watering, feed, product, soil test, expense, health event, preserves) | erfassen | Log … | Registrar … | Noter … |
    | add a thing you keep (bed, task, animal, plant, seeds, photo) | hinzufügen | Add … | Añadir … | Ajouter … |
    | report a problem (pests, diseases) | melden | Report … | Registrar … | Signaler … |
    | save a dialog | Speichern | Save | Guardar | Enregistrer |

    English uses sentence case ("Add task", not "Add Task"). French addresses
    the user with *vous*, German and Spanish with *du*/*tú*. Negative numbers
    and temperatures use the minus sign "−" (the formatters do this), ranges the
    en dash without spaces ("60–85 Tage"; date spans via `formatDateRange`:
    "5.–11. Okt."), asides the spaced en dash (" – ").
14. **Glossary.** One term per thing, in every place it appears (legend,
    detail page, planner, warnings):

    | Concept | de | en | es | fr | Tone |
    |---|---|---|---|---|---|
    | plants that help each other | Gute Nachbarn | Good neighbours | Buenos vecinos | Bons voisins | `positive`, `Check` |
    | plants that should not stand together | Ungünstige Nachbarn | Unfavourable neighbours | Vecinos desfavorables | Voisins défavorables | `warning`, `TriangleAlert` (never red ✕: placing stays allowed) |
    | a plant in a bed (free bed name) | „Tomate · Gewächshaus“ | "Tomato · Greenhouse" | | | – |

    Bed names are free text, so never glue them into a sentence with a
    preposition ("Tomate in Gewächshaus"); use the middle dot.

`src/test/conventions.test.ts` is a ratchet: the counts of `toFixed(`, text
below 11 px, raw `<select>`/`<textarea>` and `prompt/alert` may only go down.
When you migrate a page, **lower the baseline numbers** in that file.

## 2. Tokens (`src/index.css`, Tailwind v4 `@theme`)

| Token | Use |
|---|---|
| `gray-50…950` | **Overridden**: warm stone neutrals with a slight moss tint at the dark end. Keep using `gray-*`. |
| `garden-50…950` | Brand, deep sage/forest green. `garden-600` (#2f6b3a) = primary button, focus ring. Dark text: `garden-300/400`. |
| `earth-50…700` | Warm accent (sparingly: illustrations, soil). |
| `water-100…600` | Muted steel blue for water amounts (the `sky` chart series; its pale, dotted sibling `rain` for rain) and greenhouse glass on the garden map. Never a status colour. |
| `positive` `warning` `danger` `info` | Semantic tones. **One variable each, swapped automatically in `.dark`**. So `bg-danger/10 text-danger` works in both themes without a `dark:` class. |
| `focus` | Focus ring colour (`outline-focus`). |
| `shadow-xs` | Default for surfaces. Use `shadow-lg` only for floating things (menus, toasts). |

Surfaces:

- Page: `bg-gray-50` / dark `bg-gray-950` (set on `body`/`main`).
- Card: `rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900`.
  Use the `Card` primitive rather than writing it again.
- Tinted chip in dark mode: `dark:bg-{c}-500/15 dark:text-{c}-300`, never a full-saturation fill.
- Hairlines inside a card: `divide-gray-100 dark:divide-white/5`.

Base styles that apply globally: `color-scheme` light/dark (native date pickers,
scrollbars and selects follow the theme), `accent-color` brand green on
checkboxes, radios and ranges, a visible `:focus-visible` outline (2 px, offset
2) on everything, Inter with `cv11`/`ss01`, and `<time>` uses tabular figures.
Don't add `focus:outline-none` unless you replace it with a `focus-visible:`
style.

## 3. Typography (5 levels, nothing below 11 px)

| Level | Class | Size | Use |
|---|---|---|---|
| Page | `text-page` (mobile `text-2xl`) semibold | 28 px | The one `h1`, via `PageHeader` |
| Section | `text-xl font-semibold` | 20 px | Section headings inside a page |
| Title | `text-base font-semibold` | 16 px | Card titles (`CardHeader`), dialog titles are `text-lg` |
| Body | `text-sm` | 14 px | Default text, list titles, buttons |
| Meta | `text-xs` | 12 px | Labels, meta lines, badges, captions |

- Stat values use `text-2xl font-semibold tabular-nums` (`StatCard`). Use `font-bold` sparingly.
- `text-overline` (11 px, tracking) is only for uppercase group labels. Never use `text-[10px]` or smaller.
- Secondary text: `text-gray-500 dark:text-gray-400`. Do not use `gray-400` for readable text
  in light mode (2.5:1). Contrast is guaranteed at token level: `gray-500` is
  ≥ 4.9:1 on white, `gray-50` and `gray-100`; in `.dark` the token is lifted so a
  stray `text-gray-500` still reaches ≥ 4.5:1 on `gray-900/950`. Placeholders
  use the same meta colours. Counters are information, not decoration: meta colour.

## 4. Primitives (`src/components/ui/`)

All primitives are named exports, dark-mode ready and keyboard accessible.

```tsx
import { PageHeader } from "@/components/ui/PageHeader";
<PageHeader
  title={t("harvest.title")}
  description={t("harvest.subtitle")}          // one sentence or a live summary
  actions={<Button onClick={openAdd}><Plus size={16} aria-hidden="true" />{t("harvest.add")}</Button>}
  tabs={<Tabs label={t("harvest.views")} value={view} onChange={setView} items={[…]} />}  // optional
/>
```

```tsx
import { StatCard } from "@/components/ui/StatCard";
<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
  <StatCard label={t("harvest.total")} value={formatNumber(kg)} unit="kg" icon={Apple} tone="brand"
            hint={t("harvest.ofTarget", { target })} trend={{ label: "+12 %", direction: "up", tone: "positive" }} />
</div>
```
Props: `label, value (already formatted), unit?, hint?, trend?: {label, direction?: up|down|flat, tone?}, icon?, tone? (tints the icon only)`.

```tsx
import { List, ListRow } from "@/components/ui/List";
<List header={formatDate(weekStart, "monthYear")}>      {/* or label="…" without visible header */}
  <ListRow
    leading={<PlantIconDisplay plantId={h.plantId} emoji={plant.icon} size={28} />}
    title={getPlantName(h.plantId)}
    badges={<Badge tone="warning">…</Badge>}
    meta={[bedName, <time key="d" dateTime={h.date}>{formatDate(h.date, "relative")}</time>]}  // parts, not join(" · "): each part wraps as a unit, falsy parts skipped
    description={h.notes}                               // clamped to 2 lines
    trailing={formatWeight(h.grams)}                    // right-aligned value
    onClick={() => openEdit(h)}                         // whole row → edit dialog
    actions={<Menu label={t("common.moreActions")} items={[…]} />}
    muted={h.done}
  />
</List>
```
Use one card with rows for every list. Never use one `Card` per row.

```tsx
import { EmptyState } from "@/components/ui/EmptyState";
<Card><EmptyState icon={Bug} title={t("pests.emptyTitle")} description={t("pests.emptyText")}
  action={<Button onClick={openAdd}>…</Button>} secondaryAction={<Button variant="ghost">…</Button>} /></Card>
```
`compact` reduces the padding inside panels. The description says what the user gains.

```tsx
import { Badge } from "@/components/ui/Badge";
<Badge tone="danger" dot>{t("tasks.overdue")}</Badge>
<Badge variant="outline" icon={Bug}>{t("pests.types.pest")}</Badge>
```
Props: `tone: neutral|brand|positive|warning|danger|info`, `variant: soft|outline|solid`, `size: sm|md`, `icon?`, `dot?`.

```tsx
<Input label=… hint=… error=… />                         // existing API kept; + hint/error/wrapperClassName
<Select label={t("harvest.bed")} value={bedId} onChange={…} placeholder="–"
        options={beds.map((b) => ({ value: b.id, label: b.name }))} />   // or <option> children
<Textarea label=… hint=… rows={3} />
<Checkbox label={t("pests.organicOnly")} description=… checked=… onChange=… />
```
All of them tie the label to the control (`useId`), set `aria-describedby` for
hint and error, and set `aria-invalid` when there is an error.

```tsx
<SegmentedControl label={t("pests.filterLabel")} value={filter} onChange={setFilter}
  options={[{ value: "active", label: t("pests.active"), count: 2 }, …]} fullWidth? size="sm|md" />
```
Use it for filters, view switches and type toggles in dialogs (2–5 options).
It behaves as a radio group with arrow keys.

```tsx
<Tabs label={t("sufficiency.views")} value={tab} onChange={setTab}
  items={[{ value: "overview", label: t("…") }, { value: "crops", label: t("…"), count: 12 }]}>
  {tab === "overview" ? <Overview /> : <Crops />}         // optional: renders as the tabpanel
</Tabs>
```
Use tabs for sub-views of one page. They support ←/→/Home/End. On phones the
row scrolls horizontally, fades at the edge that hides more tabs and keeps the
active tab in view (`useScrollFade`).

**Two navigation levels never look alike.** Section tabs (`layout/SectionTabs`,
pages that are their own routes, e.g. Tiere · Produktion · Futter) are pills in
the shell bar above the page. A page's own view switch is the underlined `Tabs`
row under its `h1`. Never put a pill row inside a page.

```tsx
<Menu label={t("common.moreActions")} align="end" items={[
  { label: t("common.edit"), icon: Pencil, onSelect: () => openEdit(x) },
  "separator",
  { label: t("common.delete"), icon: Trash2, danger: true, onSelect: () => void remove(x) },
]} />                                                     // trigger defaults to "…"; pass trigger={<>Garten <ChevronDown/></>} for a labelled one
```
The panel is portalled (into the surrounding `<dialog>`, else `<body>`) and
shown as a popover in the top layer, so no row or sticky header can cover it.
It opens below the trigger and flips above it when there is no room.
`e2e/row-menus.spec.ts` clicks "Löschen" for real in every list (first and
last row, desktop and phone); add new lists with a row menu there.

```tsx
<IconButton icon={Check} label={t("pests.resolve")} tone="neutral|brand|danger" size="sm|md" />
```
`label` becomes the `aria-label` and the tooltip. The button is 44 px on touch screens.

```tsx
<Button variant="primary|secondary|ghost|danger|danger-ghost" size="sm|md|lg" />   // type="button" by default
<Card padding="none|sm|md">…</Card>  <CardHeader title=… description=… actions=… />
<Modal open onClose title description? size="md|lg" footer={<>…buttons…</>}>…</Modal>
<Skeleton className="h-4 w-32" />  <PageSkeleton />        // lazy routes already use PageSkeleton
```

Toast and confirm:

```tsx
const { toast, confirm } = useToast();
toast(t("harvest.saved", { name, weight: formatWeight(g) }), "success", {
  action: { label: t("common.undo"), onClick: () => restore(entry) },   // shows for 6 s
});
if (await confirm(t("common.confirmDelete"), { confirmLabel: t("common.delete") })) { … }
```

Helpers: `cn(...)` in `src/lib/cn.ts`. Tone class maps (`TONE_SOFT`,
`TONE_TEXT`, …) are in `ui/tone.ts`. Crop phases (Vorziehen, Direktsaat, Auspflanzen,
Ernte) use `PhaseBadge`/`PhaseSwatch`/`PhaseLegend`/`phaseFill` from `ui/phase.tsx`
(info blue → green → earth, icon + hatching for "Vorziehen"); the windows come from
`lib/season.ts`. Plant-family colours are the muted set in `data/plantFamilies.ts`.
Task rows everywhere use `calendar/TaskRow` with `groupTasksByDue()` (`lib/tasks.ts`). `CONTROL_CLASS` and `Field` in
`ui/Field.tsx` are for the rare custom control.

## 5. Formatting (`src/lib/format.ts`, `src/hooks/useFormat.ts`)

```tsx
const { formatDate, formatNumber, formatWeight, formatCurrency, formatVolume,
        formatArea, formatTemperature, formatPercent, locale } = useFormat();
```

| Function | Input | de | en (en-GB) |
|---|---|---|---|
| `formatDate(d, "short")` | Date \| ISO \| ms | `3. Okt.` (`3. Okt. 2025` for other years) | `3 Oct` |
| `formatDate(d, "relative")` | | `Heute`, `Gestern`, `Vor 3 Tagen`, `In 2 Tagen`; beyond ±6 days → short. Only at the start of a text or cell | `Yesterday` |
| `formatDate(d, "relativeInline")` | | the same in lower case for the middle of a sentence („erledigt: vor 3 Tagen“, ES „vencía hace 4 días“) | `due yesterday` |
| `formatDate(d, "weekdayDate")` | | `Mo., 12. Okt.` — the coming week; one date format per list group | `Mon 12 Oct` |
| `formatDate(d, "long")` | | `Montag, 5. Oktober 2026` | |
| `formatDate(d, "numeric" \| "monthYear" \| "month" \| "weekday")` | | `03.10.2026` · `Oktober 2026` · `Okt.` · `Mo.` | |
| `formatDateRange(from, to)` | two dates | `5.–11. Okt.` (month once), `10. Okt.–15. Nov.`; en dash without spaces, year only outside the current year. The one style for every date span (calendar, plant year plan, week rows) — never hand-join two dates with " – " | `5–11 Oct` |
| `formatNumber(n, { maximumFractionDigits = 1, minimumFractionDigits })` | | `1.234,6` | `1,234.6` |
| `formatWeight(grams, unit?)` | **grams** | `750 g`, `1,9 kg`, `252 kg` | `1.9 kg` |
| `formatCurrency(euros, { currency, maximumFractionDigits })` | **euros** | `473,10 €` | `€473.10` |
| `formatVolume(liters)` | litres | `10 l` | `10 l` |
| `formatArea(m2)` | m² | `13,5 m²` | |
| `formatTemperature(c)` | °C | `−1 °C` (U+2212, `−0` becomes `0 °C`) | |
| `formatPercent(ratio, digits?)` | **ratio** 0–1 | `25 %` | `25%` |

Outside React, call the same functions directly; they use the current i18n
language. Use `todayISO()` / `toISODate(d)` to store dates, and `toDate(iso)`
to parse them (it reads date-only strings as local dates, not UTC). Wrap visible
dates as `<time dateTime={iso}>…</time>` where practical.

## 6. Plurals

i18next resolves `key_one` / `key_other` (es/fr also `key_many`) via
`Intl.PluralRules`.

```json
"overdueCount_one": "{{count}} Aufgabe überfällig",
"overdueCount_other": "{{count}} Aufgaben überfällig"
```

For es and fr, `_many` is a copy of `_other`. `src/test/i18n.test.ts` enforces
four things:

- Every plural key has exactly the forms its language needs.
- `{{count}}` appears only in plural keys.
- The same keys are pluralised in all languages.
- Every `t("key", { count })` call points at a plural key.

To show a number in the text, format it first and pass it as another variable,
for example `{{weight}}`.

## 7. Charts and metrics (`src/components/ui/charts/`, `src/lib/metrics.ts`)

One small chart system instead of hand-made `div` bars. All parts are SVG,
theme-aware, use tabular figures and ship a text alternative.

| Component | Use |
|---|---|
| `BarChart` | Vertical (optionally stacked) bars over months/weeks: y-grid with 3–4 nice ticks, `formatTick` for units, `marker={{ index, label: t("charts.today") }}`, optional `target` line, hover **and** ←/→ keyboard tooltip, legend for ≥ 2 series, visually hidden `<table>`. Category labels thin out by their measured width (`axisLabelStep`), anchored on the marker, so "KW 34 KW 35" never collides on a phone. Pass only the series that have data — the legend lists every series. |
| `KeyFigures` | Page-head metrics: **one hero figure** (large, optional `visual`: `Sparkline`, `Meter`, `CompareBars`) plus 1–3 secondary figures inline, divided by hairlines. `layout="row"` for page heads, `"stack"` for side columns (rows with chevron when `to` is set). |
| `CompareBars` | 2–3 amounts of one unit as thin bars on one scale ("Ertragswert" vs "Kosten"); a hero visual, the numbers stay in text. |
| `Meter` | Horizontal progress: `actual` solid, `forecast` hatched, `target` tick. Brand colour only, the number next to it says how good it is. |
| `MonthStrip` | 12-month heatmap (one hue, 5 steps) with the value printed in each cell; outlines the current month. |
| `RangeBar` | Min–max on a shared domain (temperature per day) with a threshold tick. Neutral days are neutral gray; `emphasis` (frost night) switches to the semantic `info` tone (cold) and is always paired with a text badge ("Frost") and explained in the card description. A night only below the threshold ("Frostgefahr") is `neutral`, so emphasis rises with the danger. |
| `Sparkline` | Tiny trend line for stat tiles (`label` = summary for screen readers). |
| `Legend`, `HatchPattern`, `DotPattern` | Swatches: solid = recorded, hatched = forecast, dotted = a second measured series of the same family (rain beside watering, `rain` colour), line = target. |
| `HowCalculated` | `<details>` "Wie berechnet?" under a metric. Every KPI that is computed gets one. |

```tsx
<BarChart
  data={months.map((d, i) => ({ key: d.key, label: formatDate(d.date, "month"), fullLabel: formatDate(d.date, "monthYear"), values: [fresh[i], stored[i]] }))}
  series={[{ label: t("sufficiency.fresh"), color: "brand" }, { label: t("sufficiency.stored"), color: "earth", hatched: true }]}
  formatValue={(kg) => formatWeight(kg * 1000)} formatTick={(kg) => formatNumber(kg)}
  marker={{ index: new Date().getMonth(), label: t("charts.today") }}
  caption={t("…summary sentence…")} categoryLabel={t("charts.month")}
/>
```

Rules: one unit per chart (different units → small multiples, never one
stacked axis); series colours in fixed order `brand → earth → sky`, `muted`
for neutral shares; forecasts are hatched so meaning is not colour-only;
the caption summarises the finding.

### Key figures instead of a row of tiles

A row of four equal `StatCard`s says "everything is equally important" and
fills the page with boxes. Use it only when four numbers really are peers.
Otherwise:

```tsx
<KeyFigures
  hero={{ label: t("water.wateredThisWeek"), value: formatVolume(week), icon: Droplets, tone: "info",
          visual: <Sparkline values={weeks} color="sky" width={160} height={32} label={…} />,
          hint: t("water.plusRain", { amount }) }}
  items={[{ label: t("water.wateredInMonth", { month }), value: formatVolume(month), hint: … },
          { label: t("water.avgPerWeek"), value: formatVolume(avg), hint: … }]}
/>
```

- The hero is the number the page is about; its visual shows the trend or
  proportion (`visualPlacement="below"` for wide visuals like `CompareBars`).
- Secondary figures qualify the hero. Never show a figure that cannot apply
  (no "Milch 0 l" without goats — see `livestock/productFigures.ts`).
- Label says exactly what is counted ("Gegossen im Oktober", rain separate).

Used on: Heute (season, `stack`), Bewässerung, Tiere, Produktion, Gesundheit,
Selbstversorgung, Ernährungsplan, Kosten.

### Garden map (signature of "Heute")

`dashboard/GardenMap.tsx` draws every bed of the active garden as a small plan:
true proportions, one cell size for all beds (`packBeds`: shelf rows in planner
order, centred, common baseline — beds have no real coordinates yet), crops as
plant icons in their cells (family-colour dots below 18 px per cell), paths as
light cells. Frames carry the environment: soil texture with an earth border
(open bed), a thick wooden frame (raised bed), a `water` glass outline
(greenhouse, polytunnel, cold frame), round pots (container).

Pins (solid semantic tone, white icon, ring in the surface colour) mark what
needs attention: `positive` Apple = ripe, `warning` clipboard (+count) = task due
today/overdue, `info` snowflake = forecast frost reaches the bed (open beds at the
frost threshold, unheated greenhouses below 0 °C inside). The legend lists only
pins that occur. Every bed is a link to `/planner?bed=<id>` with a full
accessible name ("Gewächshaus · 20 Pflanzen · erntereif: Tomate · 2 Aufgaben
fällig").

### Weather: one frost sentence

`summarizeFrost()` (`lib/weatherAlerts.ts`) + `useFrostSummary()`
(`weather/frost.tsx`) produce the frost summary for **both** "Heute" and the
weather page: "Frostgefahr in 5 Nächten, bis −6 °C (So)". `FrostTaskButton`
next to it turns the warning into a "Vlies auflegen" task on the first frost
night (with undo; once planned it opens the task). `DayArc` shows today's sun
path (sunrise → sunset, sun position now) in the current-weather card.

**Numbers:** analysis pages and the dashboard take their figures from
`lib/metrics.ts` / `useGardenMetrics()` — never recompute totals in a
component. Wording is fixed: **Erfasst** (recorded harvests and animal
products in the season) vs **Prognose** (planting plan × expected yield,
herd × typical yield). Household size and animal-product prices live in
`store/analysisPrefs.ts`.
