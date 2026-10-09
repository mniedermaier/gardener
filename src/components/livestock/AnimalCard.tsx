import { expectationBasisDate, expectedShareToDate } from "@/lib/metrics";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
import { ANNUAL_YIELD } from "@/types/animal";
import type { Animal, HealthEvent } from "@/types/animal";
import { useFormat } from "@/hooks/useFormat";
import { Badge } from "@/components/ui/Badge";
import { Menu } from "@/components/ui/Menu";
import { ANIMAL_ICON, HEALTH_ICON, HEALTH_TONE, PRODUCT_ICON } from "./icons";
import { IconTile, animalLabel, formatProductAmount } from "./shared";
import { useToday } from "@/hooks/useToday";

interface AnimalCardProps {
  animal: Animal;
  /** Recorded this season, per product, in recording units. */
  recorded: Partial<Record<string, number>>;
  /** Start of "expected so far": arrival or first recorded entry (`expectationStart`). */
  expectedFrom: string;
  feedCost: number;
  lastHealth?: HealthEvent;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
}

/** One herd/colony. The whole card opens the detail page; actions sit in the menu. */
export const AnimalCard = memo(function AnimalCard({ animal, recorded, expectedFrom, feedCost, lastHealth, onEdit, onDelete, onOpen }: AnimalCardProps) {
  const now = useToday();
  const { t } = useTranslation();
  const f = useFormat();
  const yields = ANNUAL_YIELD[animal.type];
  const HealthIcon = lastHealth ? HEALTH_ICON[lastHealth.type] : null;

  // Same time basis as the recorded values: since arrival or the first entry.
  const expectationBasis = expectationBasisDate(expectedFrom, now);
  return (
    <div className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition-colors hover:border-gray-300 dark:border-white/10 dark:bg-gray-900 dark:hover:border-white/20">
      <div className="flex items-start gap-3">
        <IconTile icon={ANIMAL_ICON[animal.type]} tone="brand" size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            <button type="button" onClick={onOpen} className="text-left after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-focus">
              {animalLabel(animal, t)}
            </button>
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t(`livestock.typeCount.${animal.type}`, { count: animal.count })}
            {" · "}
            {t("livestock.sinceDate", { date: f.formatDate(animal.acquiredDate, "monthYearShort") })}
          </p>
        </div>
        <div className="relative z-10 -mr-2 -mt-1">
          <Menu
            label={t("common.moreActions")}
            items={[
              { label: t("common.edit"), icon: Pencil, onSelect: onEdit },
              "separator",
              { label: t("common.delete"), icon: Trash2, danger: true, onSelect: onDelete },
            ]}
          />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-sm dark:border-white/5">
        {yields.slice(0, 2).map((y) => {
          const Icon = PRODUCT_ICON[y.product];
          const expectedQty = y.quantity * animal.count * expectedShareToDate(y.product, now, expectedFrom);
          // "225 Eier von ~1.019 bis heute erwartet": the unit is already in the value, count only.
          const expected = y.product === "eggs" ? f.formatNumber(expectedQty, { maximumFractionDigits: 0 }) : formatProductAmount(y.product, expectedQty, f, t);
          return (
            <div key={y.product}>
              <dt className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Icon size={12} aria-hidden="true" />
                {t("livestock.recordedThisYear", { product: t(`livestock.products.${y.product}`) })}
              </dt>
              <dd className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
                {formatProductAmount(y.product, recorded[y.product] ?? 0, f, t)}
                <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">
                  {/* The basis date sits in the same hint, under the figure it qualifies. */}
                  {expectationBasis
                    ? t("livestock.ofExpectedSince", { amount: expected, date: f.formatDate(expectationBasis, "dayMonth") })
                    : t("livestock.ofExpectedToDate", { amount: expected })}
                </span>
              </dd>
            </div>
          );
        })}
        {/* Same slots on every card: products first, then the feed costs (bees too). */}
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">{t("livestock.feedTotal")}</dt>
          <dd className="font-medium tabular-nums text-gray-900 dark:text-gray-100">{f.formatCurrency(feedCost)}</dd>
        </div>
      </dl>

      {(lastHealth || animal.notes) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {lastHealth && HealthIcon && (
            <Badge tone={HEALTH_TONE[lastHealth.type]} icon={HealthIcon}>
              {t(`livestock.healthTypes.${lastHealth.type}`)} · {f.formatDate(lastHealth.date, "relative")}
            </Badge>
          )}
          {animal.notes && <span className="line-clamp-1">{animal.notes}</span>}
        </div>
      )}
    </div>
  );
});
