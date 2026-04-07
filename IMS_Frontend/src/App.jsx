import { Navigate, Route, Routes } from 'react-router-dom'
import { useSelector } from 'react-redux'

import ProtectedRoute from './components/common/ProtectedRoute'
import PublicRoute from './components/common/PublicRoute'
import DashboardLayout from './layouts/DashboardLayout'
import AuthLayout from './layouts/AuthLayout'
import AdjustmentsPage from './pages/adjustments/AdjustmentsPage'
import AlertsPage from './pages/alerts/AlertsPage'
import AccountPage from './pages/account/AccountPage'
import DashboardPage from './pages/DashboardPage'
import DeliveriesPage from './pages/deliveries/DeliveriesPage'
import StockLedgerPage from './pages/ledger/StockLedgerPage'
import NotFoundPage from './pages/NotFoundPage'
import ProductsPage from './pages/products/ProductsPage'
import ReceiptsPage from './pages/receipts/ReceiptsPage'
import TransfersPage from './pages/transfers/TransfersPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import UserManagementPage from './pages/users/UserManagementPage'
import WarehousePage from './pages/warehouse/WarehousePage'
import { selectCurrentUserRole } from './store/slices/authSlice'
import { ROLES } from './utils/constants'

function RoleHomeRedirect() {
  const role = useSelector(selectCurrentUserRole)
  return <Navigate to={role === ROLES.MANAGER ? '/dashboard' : '/receipts'} replace />
}

function App() {
  return (
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
  )
}

export default App
