import clsx from 'clsx'

export default function InputField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  hint,
  className,
  ...props
}) {
  return (
    <label className={clsx('flex flex-col gap-1.5 text-sm', className)} htmlFor={id}>
      {label && <span className="font-semibold text-ink">{label}</span>}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={clsx(
          'w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/80',
          'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
          error && 'border-red-300 focus:border-red-500 focus:ring-red-100',
        )}
        {...props}
      />
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
      {!error && hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  )
}