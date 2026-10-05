interface SkeletonProps {
  className?: string;
}

/** Placeholder block while content loads. Decorative: hidden from AT. */
export function Skeleton({ className = "h-4 w-full" }: SkeletonProps) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-gray-200 dark:bg-white/10 ${className}`} />;
}

/** Generic page placeholder for lazy routes: header, stat row, list. */
export function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">…</span>
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
      </div>
    </div>
  );
}
