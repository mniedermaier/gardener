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
   `SegmentedControl`. Each one gets a label (lint: `label-has-associated-control`).
10. **No `alert`/`prompt`.** Use a `Modal` or a `toast` instead.
11. Write user-visible strings in all 4 locales. Microcopy has no exclamation
    marks and uses active phrasing ("3 Aufgaben überfällig").

`src/test/conventions.test.ts` is a ratchet: the counts of `toFixed(`, text
below 11 px, raw `<select>`/`<textarea>` and `prompt/alert` may only go down.
When you migrate a page, **lower the baseline numbers** in that file.

## 2. Tokens (`src/index.css`, Tailwind v4 `@theme`)

| Token | Use |
|---|---|
| `gray-50…950` | **Overridden**: warm stone neutrals with a slight moss tint at the dark end. Keep using `gray-*`. |
| `garden-50…950` | Brand, deep sage/forest green. `garden-600` (#2f6b3a) = primary button, focus ring. Dark text: `garden-300/400`. |
| `earth-50…700` | Warm accent (sparingly: illustrations, soil). |
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
- Secondary text: `text-gray-500 dark:text-gray-400`. Do not use `gray-400` for readable text.

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
    meta={[bedName, formatDate(h.date, "relative")].filter(Boolean).join(" · ")}
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
Use tabs for sub-views of one page. They support ←/→/Home/End.

```tsx
<Menu label={t("common.moreActions")} align="end" items={[
  { label: t("common.edit"), icon: Pencil, onSelect: () => openEdit(x) },
  "separator",
  { label: t("common.delete"), icon: Trash2, danger: true, onSelect: () => void remove(x) },
]} />                                                     // trigger defaults to "…"; pass trigger={<>Garten <ChevronDown/></>} for a labelled one
```

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
`TONE_TEXT`, …) are in `ui/tone.ts`. `CONTROL_CLASS` and `Field` in
`ui/Field.tsx` are for the rare custom control.

## 5. Formatting (`src/lib/format.ts`, `src/hooks/useFormat.ts`)

```tsx
const { formatDate, formatNumber, formatWeight, formatCurrency, formatVolume,
        formatArea, formatTemperature, formatPercent, locale } = useFormat();
```

| Function | Input | de | en (en-GB) |
|---|---|---|---|
| `formatDate(d, "short")` | Date \| ISO \| ms | `3. Okt.` (`3. Okt. 2025` for other years) | `3 Oct` |
| `formatDate(d, "relative")` | | `Heute`, `Gestern`, `Vor 3 Tagen`, `In 2 Tagen`; beyond ±6 days → short | `Yesterday` |
| `formatDate(d, "long")` | | `Montag, 5. Oktober 2026` | |
| `formatDate(d, "numeric" \| "monthYear" \| "month" \| "weekday")` | | `03.10.2026` · `Oktober 2026` · `Okt.` · `Mo.` | |
| `formatNumber(n, { maximumFractionDigits = 1, minimumFractionDigits })` | | `1.234,6` | `1,234.6` |
| `formatWeight(grams, unit?)` | **grams** | `750 g`, `1,9 kg`, `252 kg` | `1.9 kg` |
| `formatCurrency(euros, { currency, maximumFractionDigits })` | **euros** | `473,10 €` | `€473.10` |
| `formatVolume(liters)` | litres | `10 l` | `10 l` |
| `formatArea(m2)` | m² | `13,5 m²` | |
| `formatTemperature(c)` | °C | `-1 °C` | |
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
