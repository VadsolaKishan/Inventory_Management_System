import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { FiDownload, FiSend } from 'react-icons/fi'
import toast from 'react-hot-toast'

import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import InputField from '../../components/common/InputField'
import { TableSkeleton } from '../../components/common/LoadingSkeleton'
import PageMotion from '../../components/common/PageMotion'
import PaginationControls from '../../components/common/PaginationControls'
import SelectField from '../../components/common/SelectField'
import StatusBadge from '../../components/common/StatusBadge'
import DocumentItemsEditor from '../../components/forms/DocumentItemsEditor'
import { getCount, getResults, imsService } from '../../services/imsService'
import { selectCurrentUserRole } from '../../store/slices/authSlice'
import { downloadBlobResponse, extractDownloadErrorMessage } from '../../utils/download'
import {
  DELIVERY_STATUS_OPTIONS,
  NEXT_STATUS_BY_OPERATION,
  PAGE_SIZE,
  ROLES,
} from '../../utils/constants'
import { formatDateTime } from '../../utils/format'
import { extractErrorMessage } from '../../utils/http'

const initialForm = {
  customer: '',
  source_location: '',
  notes: '',
  items: [{ product: '', quantity: 1 }],
}

const STAFF_DELIVERY_RESTRICTED_STATUSES = new Set(['done'])

export default function DeliveriesPage() {
  const currentUserRole = useSelector(selectCurrentUserRole)
  const isStaffUser = currentUserRole === ROLES.STAFF

  const [form, setForm] = useState(initialForm)
  const [customers, setCustomers] = useState([])
  const [locations, setLocations] = useState([])
  const [products, setProducts] = useState([])
  const [sourceLocationStock, setSourceLocationStock] = useState({})
  const [sourceStockLoading, setSourceStockLoading] = useState(false)

  const [deliveries, setDeliveries] = useState([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [updatingDeliveryId, setUpdatingDeliveryId] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const nextStatusMap = NEXT_STATUS_BY_OPERATION.delivery

  const customerOptions = useMemo(
    () => customers.map((item) => ({ value: item.id, label: item.name })),
    [customers],
  )
  const sourceAvailableProducts = useMemo(() => {
    if (!form.source_location) {
      return []
    }

    return products.filter(
      (product) => Number(sourceLocationStock[String(product.id)] || 0) > 0,
    )
  }, [form.source_location, products, sourceLocationStock])
  const sourceAvailableProductIds = useMemo(
    () => sourceAvailableProducts.map((product) => product.id),
    [sourceAvailableProducts],
  )
  const locationOptions = useMemo(
    () =>
      locations.map((item) => ({
        value: item.id,
        label: `${item.warehouse_name} - ${item.name} (${item.code})`,
      })),
    [locations],
  )
  const statusFilterOptions = useMemo(() => {
    if (!isStaffUser) {
      return DELIVERY_STATUS_OPTIONS
    }
    return DELIVERY_STATUS_OPTIONS.filter(
      (option) => !STAFF_DELIVERY_RESTRICTED_STATUSES.has(option.value),
    )
  }, [isStaffUser])

  useEffect(() => {
    let isMounted = true

    const loadLookups = async () => {
      try {
        const [customerRecords, locationRecords, productRecords] = await Promise.all([
          imsService.listAllCustomers(),
          imsService.listAllLocations(),
          imsService.listAllProducts(),
        ])

        if (!isMounted) {
          return
        }

        setCustomers(customerRecords)
        setLocations(locationRecords)
        setProducts(productRecords)
      } catch {
        if (isMounted) {
          setCustomers([])
          setLocations([])
          setProducts([])
        }
      }
    }

    loadLookups()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadDeliveries = async () => {
      setLoading(true)
      setError('')

      try {
        const payload = await imsService.listDeliveries({
          page,
          status: statusFilter || undefined,
        })

        if (!isMounted) {
          return
        }

        setDeliveries(getResults(payload))
        setTotalCount(getCount(payload))
      } catch (requestError) {
        if (isMounted) {
          setError(extractErrorMessage(requestError, 'Unable to load deliveries.'))
          setDeliveries([])
          setTotalCount(0)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDeliveries()

    return () => {
      isMounted = false
    }
  }, [page, statusFilter, refreshTrigger])

  useEffect(() => {
    let isMounted = true

    const loadSourceLocationStock = async () => {
      if (!form.source_location) {
        setSourceLocationStock({})
        setSourceStockLoading(false)
        return
      }

      setSourceStockLoading(true)
      try {
        const balances = await imsService.listAllStockBalances({
          location: form.source_location,
        })

        if (!isMounted) {
          return
        }

        const stockMap = balances.reduce((acc, balance) => {
          acc[String(balance.product)] = Number(balance.quantity || 0)
          return acc
        }, {})
        setSourceLocationStock(stockMap)
      } catch {
        if (isMounted) {
          setSourceLocationStock({})
        }
      } finally {
        if (isMounted) {
          setSourceStockLoading(false)
        }
      }
    }

    loadSourceLocationStock()

    return () => {
      isMounted = false
    }
  }, [form.source_location, refreshTrigger])

  const submitDelivery = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!form.customer || !form.source_location) {
      setFormError('Customer and source location are required.')
      return
    }

    if (!form.items.length || form.items.some((item) => !item.product || Number(item.quantity) <= 0)) {
      setFormError('Each item must include product and quantity greater than zero.')
      return
    }

    const selectedProducts = form.items.map((item) => String(item.product))
    if (new Set(selectedProducts).size !== selectedProducts.length) {
      setFormError('A product can only appear once in items.')
      return
    }

    const insufficientItem = form.items.find((item) => {
      const available = Number(sourceLocationStock[String(item.product)] || 0)
      return Number(item.quantity) > available
    })
    if (insufficientItem) {
      setFormError('Insufficient stock for delivery.')
      return
    }

    setSubmitting(true)
    try {
      await imsService.createDelivery({
        customer: Number(form.customer),
        source_location: Number(form.source_location),
        status: 'draft',
        notes: form.notes,
        items: form.items.map((item) => ({
          product: Number(item.product),
          quantity: Number(item.quantity),
        })),
      })

      toast.success('Delivery created successfully.')
      setForm(initialForm)
      setPage(1)
      setRefreshTrigger((value) => value + 1)
    } catch (requestError) {
      setFormError(extractErrorMessage(requestError, 'Unable to create delivery.'))
    } finally {
      setSubmitting(false)
    }
  }

  const advanceDeliveryStatus = async (delivery) => {
    const nextStatus = nextStatusMap[delivery.status]
    if (!nextStatus) {
      return
    }
    if (isStaffUser && STAFF_DELIVERY_RESTRICTED_STATUSES.has(nextStatus)) {
      toast.error('Only manager can complete operation')
      return
    }

    setUpdatingDeliveryId(delivery.id)
    try {
      await imsService.patchDelivery(delivery.id, { status: nextStatus })
      toast.success(`Delivery moved to ${nextStatus.replace('_', ' ')}.`)
      setRefreshTrigger((value) => value + 1)
    } catch (requestError) {
      toast.error(extractErrorMessage(requestError, 'Unable to update delivery status.'))
    } finally {
      setUpdatingDeliveryId(null)
    }
  }

  const exportDeliveries = async () => {
    setExporting(true)
    try {
      const response = await imsService.exportDeliveries({
        status: statusFilter || undefined,
      })
      const fileName = downloadBlobResponse(response, 'deliveries_export.xlsx')
      toast.success(`Export complete: ${fileName}`)
    } catch (requestError) {
      toast.error(await extractDownloadErrorMessage(requestError, 'Unable to export deliveries.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <PageMotion className="space-y-5">
      <Card
        title="Create Delivery Order"
        description="Delivery orders start in Draft. Stock is deducted only at Done."
      >
        <form className="space-y-4" onSubmit={submitDelivery}>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              id="delivery-customer"
              label="Customer"
              value={form.customer}
              onChange={(event) => setForm((prev) => ({ ...prev, customer: event.target.value }))}
              options={customerOptions}
              placeholder="Select customer"
            />
            <SelectField
              id="delivery-location"
              label="Source Location"
              value={form.source_location}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  source_location: event.target.value,
                }))
              }
              options={locationOptions}
              placeholder="Select location"
            />
          </div>

          <InputField
            id="delivery-notes"
            label="Notes"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Optional remarks"
          />

          <DocumentItemsEditor
            items={form.items}
            products={products}
            onChange={(items) => setForm((prev) => ({ ...prev, items }))}
            stockByProduct={sourceLocationStock}
            stockLabel="Stock at source"
            visibleProductIds={sourceAvailableProductIds}
          />

          {form.source_location && !sourceStockLoading && sourceAvailableProducts.length === 0 && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              No products are currently available at this source location.
            </p>
          )}

          {formError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</p>
          )}

          <Button type="submit" loading={submitting}>
            <FiSend /> Submit Delivery
          </Button>
        </form>
      </Card>

      <Card
        title="Recent Deliveries"
        description="Move deliveries through Draft -> Picking -> Packed -> Done."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SelectField
              id="delivery-filter-status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
              options={statusFilterOptions}
              placeholder="All statuses"
              className="min-w-[200px]"
            />
            <Button variant="secondary" loading={exporting} onClick={exportDeliveries}>
              <FiDownload /> Export Excel
            </Button>
          </div>
        }
      >
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <EmptyState title="Deliveries unavailable" description={error} />
        ) : deliveries.length === 0 ? (
          <EmptyState
            title="No deliveries yet"
            description="Create the first delivery order to dispatch inventory."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-muted">
                    <th className="px-3 py-3">Reference</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Location</th>
                    <th className="px-3 py-3">Items</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Stock Update</th>
                    <th className="px-3 py-3">Created</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((delivery) => {
                    const nextStatus = nextStatusMap[delivery.status]
                    const isRestrictedNextStatus =
                      Boolean(nextStatus) &&
                      isStaffUser &&
                      STAFF_DELIVERY_RESTRICTED_STATUSES.has(nextStatus)

                    return (
                      <tr key={delivery.id} className="table-row-hover border-b border-border/70">
                        <td className="px-3 py-3 font-medium text-ink">{delivery.reference_no}</td>
                        <td className="px-3 py-3 text-ink">{delivery.customer_name}</td>
                        <td className="px-3 py-3 text-muted">{delivery.source_location_name}</td>
                        <td className="px-3 py-3 text-muted">{delivery.items?.length || 0}</td>
                        <td className="px-3 py-3">
                          <StatusBadge value={delivery.status} />
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              delivery.is_posted
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {delivery.is_posted ? 'Applied' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted">{formatDateTime(delivery.created_at)}</td>
                        <td className="px-3 py-3 text-right">
                          {nextStatus && !isRestrictedNextStatus ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={updatingDeliveryId === delivery.id}
                              disabled={Boolean(updatingDeliveryId) && updatingDeliveryId !== delivery.id}
                              onClick={() => advanceDeliveryStatus(delivery)}
                            >
                              Move to {nextStatus.replace('_', ' ')}
                            </Button>
                          ) : isRestrictedNextStatus ? (
                            <span className="text-xs text-muted">Manager approval required</span>
                          ) : (
                            <span className="text-xs text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <PaginationControls
              page={page}
              pageSize={PAGE_SIZE}
              totalCount={totalCount}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </PageMotion>
  )
}