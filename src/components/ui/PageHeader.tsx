import { memo, type ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  /** One sentence: what the page is for, or a live summary ("3 aktiv · 1 gelöst"). */
  description?: ReactNode;
  /** Primary action(s) on the right — usually one <Button>, optionally a <Menu>. */
  actions?: ReactNode;
  /** Optional <Tabs> (without children) rendered under the title row. */
  tabs?: ReactNode;
  /** Small element left of the title, e.g. a back IconButton. */
  leading?: ReactNode;
  className?: string;
}

/** The single h1 of a page: Page level (28 px semibold). */
export const PageHeader = memo(function PageHeader({ title, description, actions, tabs, leading, className = "" }: PageHeaderProps) {
  return (
    <header className={`mb-6 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-2">
          {leading}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-page dark:text-gray-50">{title}</h1>
            {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {tabs && <div className="mt-4">{tabs}</div>}
    </header>
  );
});
