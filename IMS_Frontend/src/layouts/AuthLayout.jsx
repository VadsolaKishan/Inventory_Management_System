import { Outlet } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { FiBox, FiShield, FiTrendingUp } from 'react-icons/fi'

const highlights = [
  {
    icon: FiBox,
    title: 'Real-time Stock Visibility',
    text: 'Track movement across warehouses and locations with immediate updates.',
  },
  {
    icon: FiTrendingUp,
    title: 'Actionable Insights',
    text: 'Dashboard metrics and trends keep operations optimized and proactive.',
  },
  {
    icon: FiShield,
    title: 'Secure Access',
    text: 'JWT-based authentication with controlled module permissions.',
  },
]

export default function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <aside className="animated-grid hidden border-r border-border/70 bg-white/60 p-10 lg:block">
        <Motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto flex h-full max-w-xl flex-col justify-between"
        >
          <div>
            <p className="inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              Intelligent Inventory Platform
            </p>
            <h1 className="mt-5 font-display text-5xl leading-tight text-ink">
              Keep inventory flowing with clarity and control.
            </h1>
            <p className="mt-4 max-w-lg text-base text-muted">
              Nexus IMS connects products, warehouses, receipts, deliveries, transfers, and alerts in
              one operational cockpit.
            </p>
          </div>

          <div className="space-y-4">
            {highlights.map((item, index) => {
              const Icon = item.icon
              return (
                <Motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.1 }}
                  className="glass-card flex items-start gap-3 p-4"
                >
                  <div className="rounded-xl bg-brand-600 p-2 text-white">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{item.title}</p>
                    <p className="text-sm text-muted">{item.text}</p>
                  </div>
                </Motion.div>
              )
            })}
          </div>
        </Motion.div>
      </aside>

      <main className="flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  )
}