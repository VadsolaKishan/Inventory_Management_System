import { motion as Motion } from 'framer-motion'

import { formatNumber } from '../../utils/format'

export default function StatCard({ title, value, subtitle, icon, accentClass }) {
  const iconElement = icon ? icon({ className: 'h-5 w-5' }) : null

  return (
    <Motion.article
      className="glass-card overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">{title}</p>
            <h3 className="mt-2 text-3xl font-bold text-ink">{formatNumber(value)}</h3>
            <p className="mt-2 text-xs text-muted">{subtitle}</p>
          </div>
          <div className={`rounded-xl p-3 text-white ${accentClass}`}>{iconElement}</div>
        </div>
      </div>
    </Motion.article>
  )
}