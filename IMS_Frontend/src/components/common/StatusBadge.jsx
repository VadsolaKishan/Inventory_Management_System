import clsx from 'clsx'

const statusStyles = {
  draft: 'bg-slate-100 text-slate-700',
  waiting: 'bg-amber-100 text-amber-700',
  ready: 'bg-sky-100 text-sky-700',
  picking: 'bg-violet-100 text-violet-700',
  packed: 'bg-fuchsia-100 text-fuchsia-700',
  in_progress: 'bg-cyan-100 text-cyan-700',
  done: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
  receipt: 'bg-blue-100 text-blue-700',
  delivery: 'bg-indigo-100 text-indigo-700',
  transfer: 'bg-cyan-100 text-cyan-700',
  adjustment: 'bg-purple-100 text-purple-700',
}

export default function StatusBadge({ value }) {
  const safeValue = String(value || '').toLowerCase()
  const label = safeValue
    ? safeValue.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
    : 'N/A'

  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
        statusStyles[safeValue] || 'bg-slate-100 text-slate-700',
      )}
    >
      {label}
    </span>
  )
}