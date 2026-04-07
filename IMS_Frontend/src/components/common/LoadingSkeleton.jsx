export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`card-skeleton-${index}`}
          className="h-28 animate-pulse rounded-2xl border border-border/70 bg-white/70"
        />
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 8 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={`table-skeleton-${index}`}
          className="h-11 animate-pulse rounded-xl border border-border/70 bg-white/70"
        />
      ))}
    </div>
  )
}