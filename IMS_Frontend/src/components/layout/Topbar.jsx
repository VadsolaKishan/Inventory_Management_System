import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiBell, FiChevronDown, FiLogOut, FiMenu, FiSidebar, FiUser } from 'react-icons/fi'

import Button from '../common/Button'
import { clearCredentials, selectCurrentUser } from '../../store/slices/authSlice'
import { selectAlertCount, selectSidebarOpen, toggleSidebar } from '../../store/slices/uiSlice'
import { ROLE_LABELS, ROLES } from '../../utils/constants'

const titleMap = {
  '/dashboard': 'Dashboard Snapshot',
  '/products': 'Products Management',
  '/warehouses': 'Warehouse & Location Management',
  '/receipts': 'Incoming Receipts',
  '/deliveries': 'Delivery Orders',
  '/transfers': 'Internal Transfers',
  '/adjustments': 'Stock Adjustments',
  '/ledger': 'Stock Ledger',
  '/alerts': 'Low Stock Alerts',
  '/users': 'User Management',
  '/account': 'Account Profile',
}

const mobileTitleMap = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/warehouses': 'Warehouses',
  '/receipts': 'Receipts',
  '/deliveries': 'Deliveries',
  '/transfers': 'Transfers',
  '/adjustments': 'Adjustments',
  '/ledger': 'Ledger',
  '/alerts': 'Alerts',
  '/users': 'Users',
  '/account': 'Account',
}

function getInitials(user) {
  if (!user?.username) {
    return 'U'
  }
  const parts = String(user.username)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
  if (parts.length === 0) {
    return String(user.username).slice(0, 1).toUpperCase()
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export default function Topbar({ onOpenMobile }) {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = useSelector(selectCurrentUser)
  const sidebarOpen = useSelector(selectSidebarOpen)
  const alertCount = useSelector(selectAlertCount)
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false)
  const mobileProfileRef = useRef(null)

  const heading = useMemo(() => titleMap[location.pathname] || 'Inventory Workspace', [location.pathname])
  const mobileHeading = useMemo(
    () => mobileTitleMap[location.pathname] || 'Workspace',
    [location.pathname],
  )
  const userInitials = useMemo(() => getInitials(user), [user])

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!mobileProfileRef.current) {
        return
      }
      if (!mobileProfileRef.current.contains(event.target)) {
        setMobileProfileOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [])

  const handleLogout = () => {
    dispatch(clearCredentials())
    navigate('/login', { replace: true })
  }

  return (
    <header
      className={clsx(
        'fixed left-0 right-0 top-0 z-30 border-b border-border/70 bg-white/90 backdrop-blur transition-[left] duration-300',
        sidebarOpen ? 'lg:left-[270px]' : 'lg:left-[90px]',
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
          <button
            type="button"
            onClick={onOpenMobile}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-brand-50 hover:text-brand-700 lg:hidden"
            aria-label="Open navigation"
          >
            <FiMenu />
          </button>
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className="hidden rounded-lg p-2 text-muted transition-colors hover:bg-brand-50 hover:text-brand-700 lg:block"
            aria-label="Toggle sidebar"
          >
            <FiSidebar />
          </button>
          <div className="min-w-0">
            <h1 className="pb-0.5 font-display text-[1.75rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-2xl sm:leading-[1.05] lg:pb-2 lg:text-[2.15rem] lg:leading-[1.08]">
              <span className="sm:hidden">{mobileHeading}</span>
              <span className="hidden sm:inline">{heading}</span>
            </h1>
            <p className="hidden text-[11px] leading-snug text-muted sm:block sm:text-xs">
              Track, move, and optimize inventory in real time.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {user?.role === ROLES.MANAGER && (
            <button
              type="button"
              onClick={() => navigate('/alerts')}
              className="relative rounded-xl border border-border bg-white px-2.5 py-2 text-sm font-medium text-ink transition hover:border-brand-300 hover:bg-brand-50 sm:px-3"
              aria-label="Open alerts"
            >
              <span className="inline-flex items-center gap-2">
                <FiBell className="text-brand-600" />
                <span className="hidden sm:inline">Alerts</span>
              </span>
              {alertCount > 0 && (
                <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold text-white">
                  {alertCount}
                </span>
              )}
            </button>
          )}

          <div className="hidden rounded-xl border border-border bg-white px-3 py-2 text-right md:block">
            <p className="text-sm font-semibold text-ink">{user?.username || 'User'}</p>
            <p className="text-xs text-muted">{ROLE_LABELS[user?.role] || 'User'}</p>
          </div>

          <Button variant="secondary" size="sm" className="hidden md:inline-flex" onClick={handleLogout}>
            <FiLogOut />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>

          <div ref={mobileProfileRef} className="relative md:hidden">
            <button
              type="button"
              onClick={() => setMobileProfileOpen((value) => !value)}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-white px-2 py-1.5 text-ink transition hover:border-brand-300 hover:bg-brand-50"
              aria-label="Open profile menu"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                {userInitials}
              </span>
              <FiChevronDown className="text-muted" />
            </button>

            {mobileProfileOpen && (
              <div className="absolute right-0 top-[110%] z-40 w-52 rounded-xl border border-border bg-white p-2 shadow-card">
                <div className="border-b border-border px-2 py-2">
                  <p className="truncate text-sm font-semibold text-ink">{user?.username || 'User'}</p>
                  <p className="text-xs text-muted">{ROLE_LABELS[user?.role] || 'User'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileProfileOpen(false)
                    navigate('/account')
                  }}
                  className="mt-1 inline-flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-ink transition hover:bg-brand-50"
                >
                  <FiUser className="text-brand-600" />
                  Profile
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-red-700 transition hover:bg-red-50"
                >
                  <FiLogOut />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}