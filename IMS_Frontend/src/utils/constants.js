export const AUTH_STORAGE_KEY = 'ims_auth'

export const ROLES = {
  MANAGER: 'manager',
  STAFF: 'staff',
}

export const ROLE_LABELS = {
  [ROLES.MANAGER]: 'Manager',
  [ROLES.STAFF]: 'Staff',
}

const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

export const API_BASE_URL = (envBaseUrl && envBaseUrl.length > 0
  ? envBaseUrl
  : 'http://127.0.0.1:8000/api').replace(/\/?$/, '/')

export const PAGE_SIZE = 20

export const DOCUMENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'ready', label: 'Ready' },
  { value: 'picking', label: 'Picking' },
  { value: 'packed', label: 'Packed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const RECEIPT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'ready', label: 'Ready' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const DELIVERY_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'picking', label: 'Picking' },
  { value: 'packed', label: 'Packed' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const TRANSFER_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const ADJUSTMENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const DASHBOARD_ALL_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const DASHBOARD_STATUS_OPTIONS_BY_DOCUMENT_TYPE = {
  receipts: RECEIPT_STATUS_OPTIONS,
  deliveries: DELIVERY_STATUS_OPTIONS,
  internal: TRANSFER_STATUS_OPTIONS,
  adjustments: ADJUSTMENT_STATUS_OPTIONS,
}

export const NEXT_STATUS_BY_OPERATION = {
  receipt: {
    draft: 'waiting',
    waiting: 'ready',
    ready: 'done',
  },
  delivery: {
    draft: 'picking',
    picking: 'packed',
    packed: 'done',
  },
  transfer: {
    draft: 'in_progress',
    in_progress: 'done',
  },
}

export const DASHBOARD_DOCUMENT_OPTIONS = [
  { value: 'receipts', label: 'Receipts' },
  { value: 'deliveries', label: 'Deliveries' },
  { value: 'internal', label: 'Internal Transfers' },
  { value: 'adjustments', label: 'Adjustments' },
]

export const MOVEMENT_TYPE_OPTIONS = [
  { value: 'receipt', label: 'Receipt' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'adjustment', label: 'Adjustment' },
]

export const USER_ROLE_OPTIONS = [
  { value: ROLES.MANAGER, label: ROLE_LABELS[ROLES.MANAGER] },
  { value: ROLES.STAFF, label: ROLE_LABELS[ROLES.STAFF] },
]

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', key: 'dashboard', roles: [ROLES.MANAGER] },
  { path: '/products', label: 'Products', key: 'products', roles: [ROLES.MANAGER] },
  { path: '/warehouses', label: 'Warehouses', key: 'warehouses', roles: [ROLES.MANAGER] },
  { path: '/receipts', label: 'Receipts', key: 'receipts', roles: [ROLES.MANAGER, ROLES.STAFF] },
  {
    path: '/deliveries',
    label: 'Deliveries',
    key: 'deliveries',
    roles: [ROLES.MANAGER, ROLES.STAFF],
  },
  {
    path: '/transfers',
    label: 'Transfers',
    key: 'transfers',
    roles: [ROLES.MANAGER, ROLES.STAFF],
  },
  { path: '/adjustments', label: 'Adjustments', key: 'adjustments', roles: [ROLES.MANAGER] },
  { path: '/ledger', label: 'Stock Ledger', key: 'ledger', roles: [ROLES.MANAGER] },
  { path: '/alerts', label: 'Alerts', key: 'alerts', roles: [ROLES.MANAGER] },
  { path: '/users', label: 'User Management', key: 'users', roles: [ROLES.MANAGER] },
  { path: '/account', label: 'Account', key: 'account', roles: [ROLES.MANAGER, ROLES.STAFF] },
]