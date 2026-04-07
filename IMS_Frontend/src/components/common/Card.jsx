import clsx from 'clsx'
import { motion as Motion } from 'framer-motion'

export default function Card({
  title,
  description,
  action,
  className,
  contentClassName,
  children,
  hoverable = false,
}) {
  return (
    <Motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={hoverable ? { y: -4 } : undefined}
      className={clsx('glass-card', className)}
    >
      {(title || description || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-4 py-4 sm:px-5">
          <div>
            {title && <h3 className="text-lg font-semibold text-ink">{title}</h3>}
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={clsx('p-4 sm:p-5', contentClassName)}>{children}</div>
    </Motion.section>
  )
}