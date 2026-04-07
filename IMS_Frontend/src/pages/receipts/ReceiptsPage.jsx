import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { FiDownload, FiPlusCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'

import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import { TableSkeleton } from '../../components/common/LoadingSkeleton'
import PageMotion from '../../components/common/PageMotion'
import PaginationControls from '../../components/common/PaginationControls'
import SelectField from '../../components/common/SelectField'
import StatusBadge from '../../components/common/StatusBadge'
import DocumentItemsEditor from '../../components/forms/DocumentItemsEditor'
import InputField from '../../components/common/InputField'
import { getCount, getResults, imsService } from '../../services/imsService'
import { selectCurrentUserRole } from '../../store/slices/authSlice'
import { downloadBlobResponse, extractDownloadErrorMessage } from '../../utils/download'
import {
  NEXT_STATUS_BY_OPERATION,
  PAGE_SIZE,
  RECEIPT_STATUS_OPTIONS,
  ROLES,
} from '../../utils/constants'
import { formatDateTime } from '../../utils/format'
import { extractErrorMessage } from '../../utils/http'

const initialForm = {
  supplier: '',
  destination_location: '',
  notes: '',
  items: [{ product: '', quantity: 1 }],
}

const STAFF_RECEIPT_RESTRICTED_STATUSES = new Set(['ready', 'done'])

export default function ReceiptsPage() {
  const currentUserRole = useSelector(selectCurrentUserRole)
  const isStaffUser = currentUserRole === ROLES.STAFF

  const [form, setForm] = useState(initialForm)
  const [suppliers, setSuppliers] = useState([])
  const [locations, setLocations] = useState([])
  const [products, setProducts] = useState([])
  const [destinationLocationStock, setDestinationLocationStock] = useState({})
  const [destinationStockLoading, setDestinationStockLoading] = useState(false)

  const [receipts, setReceipts] = useState([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [updatingReceiptId, setUpdatingReceiptId] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const nextStatusMap = NEXT_STATUS_BY_OPERATION.receipt

  const supplierOptions = useMemo(
    () => suppliers.map((item) => ({ value: item.id, label: item.name })),
    [suppliers],
  )
  const locationOptions = useMemo(
    () =>
      locations.map((item) => ({
        value: item.id,
        label: `${item.warehouse_name} - ${item.name} (${item.code})`,
      })),
    [locations],
  )
  const destinationAvailableProducts = useMemo(() => {
    if (!form.destination_location) {
      return []
    }

    return products.filter((product) =>
      Object.prototype.hasOwnProperty.call(destinationLocationStock, String(product.id)),
    )
  }, [form.destination_location, products, destinationLocationStock])
  const destinationAvailableProductIds = useMemo(
    () => destinationAvailableProducts.map((product) => product.id),
    [destinationAvailableProducts],
  )
  const statusFilterOptions = useMemo(() => {
    if (!isStaffUser) {
      return RECEIPT_STATUS_OPTIONS
    }
    return RECEIPT_STATUS_OPTIONS.filter(
      (option) => !STAFF_RECEIPT_RESTRICTED_STATUSES.has(option.value),
    )
  }, [isStaffUser])

  useEffect(() => {
    let isMounted = true

    const loadLookups = async () => {
      try {
        const [supplierRecords, locationRecords, productRecords] = await Promise.all([
          imsService.listAllSuppliers(),
          imsService.listAllLocations(),
          imsService.listAllProducts(),
        ])

        if (!isMounted) {
          return
        }

        setSuppliers(supplierRecords)
        setLocations(locationRecords)
        setProducts(productRecords)
      } catch {
        if (isMounted) {
          setSuppliers([])
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

    const loadReceipts = async () => {
      setLoading(true)
      setError('')

      try {
        const payload = await imsService.listReceipts({
          page,
          status: statusFilter || undefined,
        })

        if (!isMounted) {
          return
        }

        setReceipts(getResults(payload))
        setTotalCount(getCount(payload))
      } catch (requestError) {
        if (isMounted) {
          setError(extractErrorMessage(requestError, 'Unable to load receipts.'))
          setReceipts([])
          setTotalCount(0)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadReceipts()

    return () => {
      isMounted = false
    }
  }, [page, statusFilter, refreshTrigger])

  useEffect(() => {
    let isMounted = true

    const loadDestinationLocationStock = async () => {
      if (!form.destination_location) {
        setDestinationLocationStock({})
        setDestinationStockLoading(false)
        return
      }

      setDestinationStockLoading(true)
      try {
        const balances = await imsService.listAllStockBalances({
          location: form.destination_location,
        })

        if (!isMounted) {
          return
        }

        const stockMap = balances.reduce((acc, balance) => {
          acc[String(balance.product)] = Number(balance.quantity || 0)
          return acc
        }, {})
        setDestinationLocationStock(stockMap)
      } catch {
        if (isMounted) {
          setDestinationLocationStock({})
        }
      } finally {
        if (isMounted) {
          setDestinationStockLoading(false)
        }
      }
    }

    loadDestinationLocationStock()

    return () => {
      isMounted = false
    }
  }, [form.destination_location, refreshTrigger])

  const submitReceipt = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!form.supplier || !form.destination_location) {
      setFormError('Supplier and destination location are required.')
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

    setSubmitting(true)
    try {
      await imsService.createReceipt({
        supplier: Number(form.supplier),
        destination_location: Number(form.destination_location),
        status: 'draft',
        notes: form.notes,
        items: form.items.map((item) => ({
          product: Number(item.product),
          quantity: Number(item.quantity),
        })),
      })

      toast.success('Receipt created successfully.')
      setForm(initialForm)
      setPage(1)
      setRefreshTrigger((value) => value + 1)
    } catch (requestError) {
      setFormError(extractErrorMessage(requestError, 'Unable to create receipt.'))
    } finally {
      setSubmitting(false)
    }
  }

  const advanceReceiptStatus = async (receipt) => {
    const nextStatus = nextStatusMap[receipt.status]
    if (!nextStatus) {
      return
    }
    if (isStaffUser && STAFF_RECEIPT_RESTRICTED_STATUSES.has(nextStatus)) {
      toast.error('Staff cannot set this status')
      return
    }

    setUpdatingReceiptId(receipt.id)
    try {
      await imsService.patchReceipt(receipt.id, { status: nextStatus })
      toast.success(`Receipt moved to ${nextStatus.replace('_', ' ')}.`)
      setRefreshTrigger((value) => value + 1)
    } catch (requestError) {
      toast.error(extractErrorMessage(requestError, 'Unable to update receipt status.'))
    } finally {
      setUpdatingReceiptId(null)
    }
  }

  const exportReceipts = async () => {
    setExporting(true)
    try {
      const response = await imsService.exportReceipts({
        status: statusFilter || undefined,
      })
      const fileName = downloadBlobResponse(response, 'receipts_export.xlsx')
      toast.success(`Export complete: ${fileName}`)
    } catch (requestError) {
      toast.error(await extractDownloadErrorMessage(requestError, 'Unable to export receipts.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <PageMotion className="space-y-5">
      <Card
        title="Create Incoming Receipt"
        description="Receipts start in Draft. Stock is applied only when the document reaches Done."
      >
        <form className="space-y-4" onSubmit={submitReceipt}>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              id="receipt-supplier"
              label="Supplier"
              value={form.supplier}
              onChange={(event) => setForm((prev) => ({ ...prev, supplier: event.target.value }))}
              options={supplierOptions}
              placeholder="Select supplier"
            />
            <SelectField
              id="receipt-location"
              label="Destination Location"
              value={form.destination_location}
              onChange={(event) => {
                const nextLocation = event.target.value
                setForm((prev) => ({
                  ...prev,
                  destination_location: nextLocation,
                  items: prev.items.map((item) => ({
                    ...item,
                    product: '',
                  })),
                }))
              }}
              options={locationOptions}
              placeholder="Select location"
            />
          </div>

          <InputField
            id="receipt-notes"
            label="Notes"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Optional remarks"
          />

          <DocumentItemsEditor
            items={form.items}
            products={products}
            onChange={(items) => setForm((prev) => ({ ...prev, items }))}
            stockByProduct={destinationLocationStock}
            stockLabel="Stock at destination"
            visibleProductIds={destinationAvailableProductIds}
          />

          {form.destination_location && !destinationStockLoading && destinationAvailableProducts.length === 0 && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              No products are currently available at this destination location.
            </p>
          )}

          {formError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</p>
          )}

          <Button type="submit" loading={submitting}>
            <FiPlusCircle /> Submit Receipt
          </Button>
        </form>
      </Card>

      <Card
        title="Recent Receipts"
        description="Move receipts through Draft -> Waiting -> Ready -> Done."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SelectField
              id="receipt-filter-status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
              options={statusFilterOptions}
              placeholder="All statuses"
              className="min-w-[200px]"
            />
            <Button variant="secondary" loading={exporting} onClick={exportReceipts}>
              <FiDownload /> Export Excel
            </Button>
          </div>
        }
      >
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <EmptyState title="Receipts unavailable" description={error} />
        ) : receipts.length === 0 ? (
          <EmptyState title="No receipts yet" description="Create the first receipt to log incoming stock." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-muted">
                    <th className="px-3 py-3">Reference</th>
                    <th className="px-3 py-3">Supplier</th>
                    <th className="px-3 py-3">Location</th>
                    <th className="px-3 py-3">Items</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Stock Update</th>
                    <th className="px-3 py-3">Created</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => {
                    const nextStatus = nextStatusMap[receipt.status]
                    const isRestrictedNextStatus =
                      Boolean(nextStatus) &&
                      isStaffUser &&
                      STAFF_RECEIPT_RESTRICTED_STATUSES.has(nextStatus)

                    return (
                      <tr key={receipt.id} className="table-row-hover border-b border-border/70">
                        <td className="px-3 py-3 font-medium text-ink">{receipt.reference_no}</td>
                        <td className="px-3 py-3 text-ink">{receipt.supplier_name}</td>
                        <td className="px-3 py-3 text-muted">{receipt.destination_location_name}</td>
                        <td className="px-3 py-3 text-muted">{receipt.items?.length || 0}</td>
                        <td className="px-3 py-3">
                          <StatusBadge value={receipt.status} />
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              receipt.is_posted
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {receipt.is_posted ? 'Applied' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted">{formatDateTime(receipt.created_at)}</td>
                        <td className="px-3 py-3 text-right">
                          {nextStatus && !isRestrictedNextStatus ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={updatingReceiptId === receipt.id}
                              disabled={Boolean(updatingReceiptId) && updatingReceiptId !== receipt.id}
                              onClick={() => advanceReceiptStatus(receipt)}
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