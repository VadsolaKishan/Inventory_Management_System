import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useSelector } from 'react-redux'

import ProtectedRoute from './components/common/ProtectedRoute'
import PublicRoute from './components/common/PublicRoute'
import { selectCurrentUserRole } from './store/slices/authSlice'
import { ROLES } from './utils/constants'

const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'))
const AuthLayout = lazy(() => import('./layouts/AuthLayout'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const AccountPage = lazy(() => import('./pages/account/AccountPage'))
const ReceiptsPage = lazy(() => import('./pages/receipts/ReceiptsPage'))
const DeliveriesPage = lazy(() => import('./pages/deliveries/DeliveriesPage'))
const TransfersPage = lazy(() => import('./pages/transfers/TransfersPage'))
const ProductsPage = lazy(() => import('./pages/products/ProductsPage'))
const WarehousePage = lazy(() => import('./pages/warehouse/WarehousePage'))
const AdjustmentsPage = lazy(() => import('./pages/adjustments/AdjustmentsPage'))
const StockLedgerPage = lazy(() => import('./pages/ledger/StockLedgerPage'))
const AlertsPage = lazy(() => import('./pages/alerts/AlertsPage'))
const UserManagementPage = lazy(() => import('./pages/users/UserManagementPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function RoleHomeRedirect() {
  const role = useSelector(selectCurrentUserRole)
  return <Navigate to={role === ROLES.MANAGER ? '/dashboard' : '/receipts'} replace />
}

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-muted shadow-soft">
        Loading workspace...
      </div>
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[ROLES.MANAGER, ROLES.STAFF]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<RoleHomeRedirect />} />

            <Route element={<ProtectedRoute allowedRoles={[ROLES.MANAGER]} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/warehouses" element={<WarehousePage />} />
              <Route path="/adjustments" element={<AdjustmentsPage />} />
              <Route path="/ledger" element={<StockLedgerPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/users" element={<UserManagementPage />} />
            </Route>

            <Route path="/receipts" element={<ReceiptsPage />} />
            <Route path="/deliveries" element={<DeliveriesPage />} />
            <Route path="/transfers" element={<TransfersPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default App
