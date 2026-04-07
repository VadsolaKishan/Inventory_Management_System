import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'

import { selectCurrentUserRole, selectIsAuthenticated } from '../../store/slices/authSlice'
import { ROLES } from '../../utils/constants'

export default function ProtectedRoute({ allowedRoles = [] }) {
  const location = useLocation()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const role = useSelector(selectCurrentUserRole)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={role === ROLES.MANAGER ? '/dashboard' : '/receipts'} replace />
  }

  return <Outlet />
}