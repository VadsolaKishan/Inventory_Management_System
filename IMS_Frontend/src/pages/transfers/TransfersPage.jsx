import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { FiDownload, FiRepeat } from 'react-icons/fi'
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
  NEXT_STATUS_BY_OPERATION,
  PAGE_SIZE,
  ROLES,
  TRANSFER_STATUS_OPTIONS,
} from '../../utils/constants'
import { formatDateTime } from '../../utils/format'
import { extractErrorMessage } from '../../utils/http'

const initialForm = {
  from_location: '',
  to_location: '',
  notes: '',
  items: [{ product: '', quantity: 1 }],
}

const STAFF_TRANSFER_RESTRICTED_STATUSES = new Set(['done'])

export default function TransfersPage() {
  const currentUserRole = useSelector(selectCurrentUserRole)
  const isStaffUser = currentUserRole === ROLES.STAFF

  const [form, setForm] = useState(initialForm)
  const [locations, setLocations] = useState([])
  const [products, setProducts] = useState([])
  const [fromLocationStock, setFromLocationStock] = useState({})
  const [fromStockLoading, setFromStockLoading] = useState(false)

  const [transfers, setTransfers] = useState([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [updatingTransferId, setUpdatingTransferId] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const nextStatusMap = NEXT_STATUS_BY_OPERATION.transfer

  const fromAvailableProducts = useMemo(() => {
    if (!form.from_location) {
      return []
    }

    return products.filter(
      (product) => Number(fromLocationStock[String(product.id)] || 0) > 0,
    )
  }, [form.from_location, products, fromLocationStock])
  const fromAvailableProductIds = useMemo(
    () => fromAvailableProducts.map((product) => product.id),
    [fromAvailableProducts],
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
      return TRANSFER_STATUS_OPTIONS
    }
    return TRANSFER_STATUS_OPTIONS.filter(
      (option) => !STAFF_TRANSFER_RESTRICTED_STATUSES.has(option.value),
    )
  }, [isStaffUser])

  useEffect(() => {
    let isMounted = true

    const loadLookups = async () => {
      try {
        const [locationRecords, productRecords] = await Promise.all([
          imsService.listAllLocations(),
          imsService.listAllProducts(),
        ])

        if (!isMounted) {
          return
        }

        setLocations(locationRecords)
        setProducts(productRecords)
      } catch {
        if (isMounted) {
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

    const loadTransfers = async () => {
      setLoading(true)
      setError('')

      try {
        const payload = await imsService.listTransfers({
          page,
          status: statusFilter || undefined,
        })

        if (!isMounted) {
          return
        }

        setTransfers(getResults(payload))
        setTotalCount(getCount(payload))
      } catch (requestError) {
        if (isMounted) {
          setError(extractErrorMessage(requestError, 'Unable to load transfers.'))
          setTransfers([])
          setTotalCount(0)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadTransfers()

    return () => {
      isMounted = false
    }
  }, [page, statusFilter, refreshTrigger])

  useEffect(() => {
    let isMounted = true

    const loadFromLocationStock = async () => {
      if (!form.from_location) {
        setFromLocationStock({})
        setFromStockLoading(false)
        return
      }

      setFromStockLoading(true)
      try {
        const balances = await imsService.listAllStockBalances({
          location: form.from_location,
        })

        if (!isMounted) {
          return
        }

        const stockMap = balances.reduce((acc, balance) => {
          acc[String(balance.product)] = Number(balance.quantity || 0)
          return acc
        }, {})
        setFromLocationStock(stockMap)
      } catch {
        if (isMounted) {
          setFromLocationStock({})
        }
      } finally {
        if (isMounted) {
          setFromStockLoading(false)
        }
      }
    }

    loadFromLocationStock()

    return () => {
      isMounted = false
    }
  }, [form.from_location, refreshTrigger])

  const submitTransfer = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!form.from_location || !form.to_location) {
      setFormError('From location and to location are required.')
      return
    }

    if (String(form.from_location) === String(form.to_location)) {
      setFormError('Destination location must be different from source location.')
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
      const available = Number(fromLocationStock[String(item.product)] || 0)
      return Number(item.quantity) > available
    })
    if (insufficientItem) {
      setFormError('Insufficient stock for transfer')
      return
    }

    setSubmitting(true)
    try {
      await imsService.createTransfer({
        from_location: Number(form.from_location),
        to_location: Number(form.to_location),
        status: 'draft',
        notes: form.notes,
        items: form.items.map((item) => ({
          product: Number(item.product),
          quantity: Number(item.quantity),
        })),
      })

      toast.success('Transfer created successfully.')
      setForm(initialForm)
      setPage(1)
      setRefreshTrigger((value) => value + 1)
    } catch (requestError) {
      setFormError(extractErrorMessage(requestError, 'Unable to create transfer.'))
    } finally {
      setSubmitting(false)
    }
  }

  const advanceTransferStatus = async (transfer) => {
    const nextStatus = nextStatusMap[transfer.status]
    if (!nextStatus) {
      return
    }
    if (isStaffUser && STAFF_TRANSFER_RESTRICTED_STATUSES.has(nextStatus)) {
      toast.error('Only manager can complete operation')
      return
    }

    setUpdatingTransferId(transfer.id)
    try {
      await imsService.patchTransfer(transfer.id, { status: nextStatus })
      toast.success(`Transfer moved to ${nextStatus.replace('_', ' ')}.`)
      setRefreshTrigger((value) => value + 1)
    } catch (requestError) {
      toast.error(extractErrorMessage(requestError, 'Unable to update transfer status.'))
    } finally {
      setUpdatingTransferId(null)
    }
  }

  const exportTransfers = async () => {
    setExporting(true)
    try {
      const response = await imsService.exportTransfers({
        status: statusFilter || undefined,
      })
      const fileName = downloadBlobResponse(response, 'transfers_export.xlsx')
      toast.success(`Export complete: ${fileName}`)
    } catch (requestError) {
      toast.error(await extractDownloadErrorMessage(requestError, 'Unable to export transfers.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <PageMotion className="space-y-5">
      <Card
        title="Create Internal Transfer"
        description="Transfers start in Draft. Stock moves only when the transfer reaches Done."
      >
        <form className="space-y-4" onSubmit={submitTransfer}>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              id="transfer-from"
              label="From Location"
              value={form.from_location}
              onChange={(event) => setForm((prev) => ({ ...prev, from_location: event.target.value }))}
              options={locationOptions}
              placeholder="Select source"
            />
            <SelectField
              id="transfer-to"
              label="To Location"
              value={form.to_location}
              onChange={(event) => setForm((prev) => ({ ...prev, to_location: event.target.value }))}
              options={locationOptions}
              placeholder="Select destination"
            />
          </div>

          <InputField
            id="transfer-notes"
            label="Notes"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Optional remarks"
          />

          <DocumentItemsEditor
            items={form.items}
            products={products}
            onChange={(items) => setForm((prev) => ({ ...prev, items }))}
            stockByProduct={fromLocationStock}
            stockLabel="Stock at source"
            visibleProductIds={fromAvailableProductIds}
          />

          {form.from_location && !fromStockLoading && fromAvailableProducts.length === 0 && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              No products are currently available at this source location.
            </p>
          )}

          {formError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</p>
          )}

          <Button type="submit" loading={submitting}>
            <FiRepeat /> Submit Transfer
          </Button>
        </form>
      </Card>

      <Card
        title="Recent Transfers"
        description="Move transfers through Draft -> In Progress -> Done."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SelectField
              id="transfer-filter-status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
              options={statusFilterOptions}
              placeholder="All statuses"
              className="min-w-[200px]"
            />
            <Button variant="secondary" loading={exporting} onClick={exportTransfers}>
              <FiDownload /> Export Excel
            </Button>
          </div>
        }
      >
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <EmptyState title="Transfers unavailable" description={error} />
        ) : transfers.length === 0 ? (
          <EmptyState
            title="No transfers yet"
            description="Create an internal transfer to move inventory between locations."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-muted">
                    <th className="px-3 py-3">Reference</th>
                    <th className="px-3 py-3">From</th>
                    <th className="px-3 py-3">To</th>
                    <th className="px-3 py-3">Items</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Stock Update</th>
                    <th className="px-3 py-3">Created</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((transfer) => {
                    const nextStatus = nextStatusMap[transfer.status]
                    const isRestrictedNextStatus =
                      Boolean(nextStatus) &&
                      isStaffUser &&
                      STAFF_TRANSFER_RESTRICTED_STATUSES.has(nextStatus)

                    return (
                      <tr key={transfer.id} className="table-row-hover border-b border-border/70">
                        <td className="px-3 py-3 font-medium text-ink">{transfer.reference_no}</td>
                        <td className="px-3 py-3 text-ink">{transfer.from_location_name}</td>
                        <td className="px-3 py-3 text-muted">{transfer.to_location_name}</td>
                        <td className="px-3 py-3 text-muted">{transfer.items?.length || 0}</td>
                        <td className="px-3 py-3">
                          <StatusBadge value={transfer.status} />
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              transfer.is_posted
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {transfer.is_posted ? 'Applied' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted">{formatDateTime(transfer.created_at)}</td>
                        <td className="px-3 py-3 text-right">
                          {nextStatus && !isRestrictedNextStatus ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={updatingTransferId === transfer.id}
                              disabled={Boolean(updatingTransferId) && updatingTransferId !== transfer.id}
                              onClick={() => advanceTransferStatus(transfer)}
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