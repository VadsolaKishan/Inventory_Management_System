import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'

import { selectCurrentUserRole, selectIsAuthenticated } from '../../store/slices/authSlice'
import { ROLES } from '../../utils/constants'

export default function PublicRoute() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const role = useSelector(selectCurrentUserRole)

  if (isAuthenticated) {
    return <Navigate to={role === ROLES.MANAGER ? '/dashboard' : '/receipts'} replace />
  }

  return <Outlet />
}