import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'

import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import { getCount, imsService } from '../services/imsService'
import { selectCurrentUser, selectCurrentUserRole } from '../store/slices/authSlice'
import { setAlertCount } from '../store/slices/uiSlice'
import { ROLES } from '../utils/constants'

export default function DashboardLayout() {
  const dispatch = useDispatch()
  const user = useSelector(selectCurrentUser)
  const role = useSelector(selectCurrentUserRole)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const previousAlertCount = useRef(0)

  useEffect(() => {
    if (role !== ROLES.MANAGER) {
      dispatch(setAlertCount(0))
      return undefined
    }

    let isMounted = true
    const alertStorageKey = `ims_alert_count_seen:${user?.username || 'manager'}`

    const readStoredCount = () => {
      try {
        const rawValue = localStorage.getItem(alertStorageKey)
        const parsed = Number(rawValue)
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
      } catch {
        return 0
      }
    }

    const writeStoredCount = (count) => {
      try {
        localStorage.setItem(alertStorageKey, String(Math.max(0, Number(count) || 0)))
      } catch {
        // Ignore storage write failures.
      }
    }

    const emitToastIfRaised = (count) => {
      const storedCount = readStoredCount()
      const baseline = Math.max(previousAlertCount.current, storedCount)
      if (count > 0 && count > baseline) {
        toast(`Low stock warning: ${count} products need attention.`)
      }
      previousAlertCount.current = count
      writeStoredCount(count)
    }

    const fetchAlerts = async () => {
      try {
        const payload = await imsService.getAlerts({ page: 1, page_size: 1 })
        if (!isMounted) {
          return
        }

        const count = getCount(payload)
        dispatch(setAlertCount(count))
        emitToastIfRaised(count)
      } catch {
        if (!isMounted) {
          return
        }

        try {
          const dashboardPayload = await imsService.getDashboard()
          if (!isMounted) {
            return
          }

          const lowStock = Number(dashboardPayload?.totals?.low_stock || 0)
          const outOfStock = Number(dashboardPayload?.totals?.out_of_stock || 0)
          const fallbackCount = lowStock + outOfStock
          dispatch(setAlertCount(fallbackCount))
          emitToastIfRaised(fallbackCount)
        } catch {
          // Keep the last known value instead of resetting to 0 on transient failures.
        }
      }
    }

    fetchAlerts()
    const interval = setInterval(fetchAlerts, 60000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [dispatch, role, user?.username])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />

      <div className="content-scroll flex h-screen min-w-0 flex-1 flex-col overflow-y-auto pt-[72px] sm:pt-[84px] lg:pt-[92px]">
        <Topbar onOpenMobile={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 max-w-full px-3 py-3 sm:px-5 sm:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}