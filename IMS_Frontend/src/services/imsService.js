import api from './apiClient'

function unwrap(response) {
  return response.data
}

function list(resource, params = {}) {
  return api.get(`${resource}/`, { params }).then(unwrap)
}

function create(resource, payload) {
  return api.post(`${resource}/`, payload).then(unwrap)
}

function update(resource, id, payload) {
  return api.put(`${resource}/${id}/`, payload).then(unwrap)
}

function patch(resource, id, payload) {
  return api.patch(`${resource}/${id}/`, payload).then(unwrap)
}

function remove(resource, id) {
  return api.delete(`${resource}/${id}/`).then(unwrap)
}

function download(resource, params = {}) {
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const requestParams = {
    ...params,
    timezone: params?.timezone || browserTimeZone,
  }

  return api.get(resource, {
    params: requestParams,
    responseType: 'blob',
  })
}

async function listAll(resource, params = {}, maxPages = 20) {
  const records = []
  let currentPage = 1

  while (currentPage <= maxPages) {
    const payload = await list(resource, {
      ...params,
      page: currentPage,
    })

    records.push(...getResults(payload))

    if (!payload?.next) {
      break
    }

    currentPage += 1
  }

  return records
}

export function getResults(payload) {
  if (!payload) {
    return []
  }
  if (Array.isArray(payload)) {
    return payload
  }
  return payload.results || []
}

export function getCount(payload) {
  if (!payload) {
    return 0
  }
  if (typeof payload.count === 'number') {
    return payload.count
  }
  if (Array.isArray(payload)) {
    return payload.length
  }
  return 0
}

export const imsService = {
  listCategories: (params) => list('categories', params),
  listAllCategories: () => listAll('categories'),
  createCategory: (payload) => create('categories', payload),
  updateCategory: (id, payload) => update('categories', id, payload),
  deleteCategory: (id) => remove('categories', id),

  listProducts: (params) => list('products', params),
  listAllProducts: () => listAll('products'),
  createProduct: (payload) => create('products', payload),
  updateProduct: (id, payload) => update('products', id, payload),
  deleteProduct: (id) => remove('products', id),
  getProductStockPerLocation: (id, params) =>
    api.get(`products/${id}/stock-per-location/`, { params }).then(unwrap),

  listWarehouses: (params) => list('warehouses', params),
  listAllWarehouses: () => listAll('warehouses'),
  createWarehouse: (payload) => create('warehouses', payload),
  updateWarehouse: (id, payload) => update('warehouses', id, payload),
  deleteWarehouse: (id) => remove('warehouses', id),

  listLocations: (params) => list('locations', params),
  listAllLocations: (params) => listAll('locations', params),
  createLocation: (payload) => create('locations', payload),
  updateLocation: (id, payload) => update('locations', id, payload),
  deleteLocation: (id) => remove('locations', id),

  listSuppliers: (params) => list('suppliers', params),
  listAllSuppliers: () => listAll('suppliers'),
  createSupplier: (payload) => create('suppliers', payload),
  updateSupplier: (id, payload) => update('suppliers', id, payload),

  listCustomers: (params) => list('customers', params),
  listAllCustomers: () => listAll('customers'),
  createCustomer: (payload) => create('customers', payload),
  updateCustomer: (id, payload) => update('customers', id, payload),

  listReceipts: (params) => list('receipts', params),
  createReceipt: (payload) => create('receipts', payload),
  updateReceipt: (id, payload) => update('receipts', id, payload),
  patchReceipt: (id, payload) => patch('receipts', id, payload),

  listDeliveries: (params) => list('deliveries', params),
  createDelivery: (payload) => create('deliveries', payload),
  updateDelivery: (id, payload) => update('deliveries', id, payload),
  patchDelivery: (id, payload) => patch('deliveries', id, payload),

  listTransfers: (params) => list('transfers', params),
  createTransfer: (payload) => create('transfers', payload),
  updateTransfer: (id, payload) => update('transfers', id, payload),
  patchTransfer: (id, payload) => patch('transfers', id, payload),

  listAdjustments: (params) => list('adjustments', params),
  createAdjustment: (payload) => create('adjustments', payload),
  updateAdjustment: (id, payload) => update('adjustments', id, payload),

  listStockBalances: (params) => list('stock-balances', params),
  listAllStockBalances: (params) => listAll('stock-balances', params),
  listStockLedger: (params) => list('stock-ledger', params),

  exportProducts: (params) => download('export/products/', params),
  exportLedger: (params) => download('export/ledger/', params),
  exportReceipts: (params) => download('export/receipts/', params),
  exportDeliveries: (params) => download('export/deliveries/', params),
  exportTransfers: (params) => download('export/transfers/', params),
  exportAdjustments: (params) => download('export/adjustments/', params),

  getDashboard: (params) => api.get('dashboard/', { params }).then(unwrap),
  getAlerts: (params) => list('alerts', params),

  listUsers: (params) => list('users', params),
  createManager: (payload) => api.post('users/create-manager/', payload).then(unwrap),
  createStaff: (payload) => api.post('users/create-staff/', payload).then(unwrap),
}