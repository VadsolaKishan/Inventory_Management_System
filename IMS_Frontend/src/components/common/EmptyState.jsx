export default function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white/80 p-8 text-center">
      <h4 className="text-lg font-semibold text-ink">{title}</h4>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  )
}