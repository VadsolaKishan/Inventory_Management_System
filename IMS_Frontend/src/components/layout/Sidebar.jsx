import clsx from 'clsx'
import { NavLink } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  FiAlertCircle,
  FiArchive,
  FiBarChart2,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiHome,
  FiLayers,
  FiMap,
  FiPackage,
  FiRepeat,
  FiTruck,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'

import { NAV_ITEMS, ROLES } from '../../utils/constants'
import { selectCurrentUser } from '../../store/slices/authSlice'
import { selectSidebarOpen, toggleSidebar } from '../../store/slices/uiSlice'

const iconMap = {
  dashboard: FiHome,
  products: FiPackage,
  warehouses: FiMap,
  receipts: FiClipboard,
  deliveries: FiTruck,
  transfers: FiRepeat,
  adjustments: FiLayers,
  ledger: FiBarChart2,
  alerts: FiAlertCircle,
  users: FiUsers,
  account: FiUser,
}

function SidebarLinks({ role, compact = false, onNavigate }) {
  const visibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(role || ROLES.STAFF))

  return (
    <nav
      className={clsx(
        'sidebar-scroll mt-2 flex-1 space-y-2 overflow-y-scroll px-3 py-2 pr-2',
        compact && 'px-2 pr-2',
      )}
    >
      {visibleNavItems.map((item) => {
        const Icon = iconMap[item.key] || FiArchive
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                'group relative flex items-center rounded-2xl px-3.5 py-3 text-[17px] font-semibold leading-6 transition-all duration-200',
                isActive
                  ? 'bg-brand-100 text-brand-800'
                  : 'text-slate-500 hover:bg-white hover:text-brand-700',
                compact && 'justify-center px-2.5 py-3',
              )
            }
            title={item.label}
          >
            {({ isActive }) => (
              <>
                {!compact && isActive && (
                  <span className="absolute inset-y-2.5 left-1 w-1 rounded-full bg-brand-700" />
                )}
                <Icon className={clsx('h-5 w-5 shrink-0', !compact && 'mr-3')} />
                <span
                  className={clsx(
                    'truncate transition-all duration-300',
                    compact ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100',
                  )}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

export default function Sidebar({ mobileOpen, onCloseMobile }) {
  const dispatch = useDispatch()
  const user = useSelector(selectCurrentUser)
  const sidebarOpen = useSelector(selectSidebarOpen)

  return (
    <>
      <aside
        className={clsx(
          'hidden h-screen overflow-hidden border-r border-slate-200/80 bg-slate-50/95 backdrop-blur transition-[width] duration-300 ease-in-out lg:flex lg:flex-col',
          sidebarOpen ? 'w-[270px]' : 'w-[90px]',
        )}
      >
        <div
          className={clsx(
            'h-[92px] border-b border-slate-200/80',
            sidebarOpen ? 'px-4' : 'px-0',
          )}
        >
          <div
            className={clsx(
              'flex h-full items-center',
              sidebarOpen ? 'gap-3' : 'justify-center',
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <FiPackage />
            </div>
            <div
              className={clsx(
                'overflow-hidden whitespace-nowrap transition-all duration-300',
                sidebarOpen ? 'max-w-[180px] opacity-100' : 'max-w-0 opacity-0',
              )}
            >
              <p className="font-display text-lg text-ink">Nexus IMS</p>
              <p className="text-xs text-slate-500">Inventory Intelligence</p>
            </div>
          </div>
        </div>

        <SidebarLinks role={user?.role} compact={!sidebarOpen} />

        <div className="mt-auto border-t border-slate-200/80 p-3 text-xs text-slate-500">
          {sidebarOpen ? (
            <button
              type="button"
              onClick={() => dispatch(toggleSidebar())}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-200/70 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
            >
              <FiChevronLeft />
              Collapse
            </button>
          ) : (
            <button
              type="button"
              onClick={() => dispatch(toggleSidebar())}
              className="inline-flex w-full items-center justify-center rounded-xl bg-slate-200/70 px-3 py-2 text-slate-600 transition hover:bg-slate-200"
              aria-label="Expand sidebar"
            >
              <FiChevronRight />
            </button>
          )}
        </div>
      </aside>

      <div
        className={clsx(
          'fixed inset-0 z-40 bg-ink/35 transition-opacity lg:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onCloseMobile}
      />

      <aside
        className={clsx(
          'fixed bottom-0 left-0 top-0 z-50 flex w-[84vw] max-w-[300px] flex-col overflow-hidden border-r border-slate-200/80 bg-slate-50 shadow-card transition-transform lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-5">
          <div>
            <p className="font-display text-lg text-ink">Nexus IMS</p>
            <p className="text-xs text-slate-500">Operations Panel</p>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-brand-50 hover:text-brand-700"
            aria-label="Close sidebar"
          >
            <FiX />
          </button>
        </div>

        <SidebarLinks role={user?.role} onNavigate={onCloseMobile} />
      </aside>
    </>
  )
}