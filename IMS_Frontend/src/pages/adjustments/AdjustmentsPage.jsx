import { useEffect, useMemo, useState } from 'react'
import { FiDownload, FiSliders } from 'react-icons/fi'
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
import { getCount, getResults, imsService } from '../../services/imsService'
import { downloadBlobResponse, extractDownloadErrorMessage } from '../../utils/download'
import { PAGE_SIZE } from '../../utils/constants'
import { formatDateTime, formatSignedNumber } from '../../utils/format'
import { extractErrorMessage } from '../../utils/http'

const initialForm = {
  product: '',
  location: '',
  counted_quantity: 0,
  notes: '',
}

export default function AdjustmentsPage() {
  const [form, setForm] = useState(initialForm)
  const [systemQuantity, setSystemQuantity] = useState(0)

  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])

  const [adjustments, setAdjustments] = useState([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const productOptions = useMemo(
    () => products.map((item) => ({ value: item.id, label: `${item.name} (${item.sku})` })),
    [products],
  )
  const locationOptions = useMemo(
    () =>
      locations.map((item) => ({
        value: item.id,
        label: `${item.warehouse_name} - ${item.name} (${item.code})`,
      })),
    [locations],
  )

  const countedQuantity = Number(form.counted_quantity || 0)
  const differencePreview = countedQuantity - Number(systemQuantity || 0)

  useEffect(() => {
    let isMounted = true

    const loadLookups = async () => {
      try {
        const [productRecords, locationRecords] = await Promise.all([
          imsService.listAllProducts(),
          imsService.listAllLocations(),
        ])

        if (!isMounted) {
          return
        }

        setProducts(productRecords)
        setLocations(locationRecords)
      } catch {
        if (isMounted) {
          setProducts([])
          setLocations([])
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

    const loadAdjustments = async () => {
      setLoading(true)
      setError('')

      try {
        const payload = await imsService.listAdjustments({
          page,
        })

        if (!isMounted) {
          return
        }

        setAdjustments(getResults(payload))
        setTotalCount(getCount(payload))
      } catch (requestError) {
        if (isMounted) {
          setError(extractErrorMessage(requestError, 'Unable to load adjustments.'))
          setAdjustments([])
          setTotalCount(0)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadAdjustments()

    return () => {
      isMounted = false
    }
  }, [page, refreshTrigger])

  useEffect(() => {
    let isMounted = true

    const loadSystemQuantity = async () => {
      if (!form.product || !form.location) {
        setSystemQuantity(0)
        return
      }

      try {
        const payload = await imsService.listStockBalances({
          product: form.product,
          location: form.location,
          page: 1,
        })

        if (!isMounted) {
          return
        }

        const balances = getResults(payload)
        setSystemQuantity(balances[0]?.quantity || 0)
      } catch {
        if (isMounted) {
          setSystemQuantity(0)
        }
      }
    }

    loadSystemQuantity()

    return () => {
      isMounted = false
    }
  }, [form.product, form.location])

  const submitAdjustment = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!form.product || !form.location) {
      setFormError('Product and location are required.')
      return
    }

    if (Number(form.counted_quantity) < 0) {
      setFormError('Counted quantity must be zero or positive.')
      return
    }

    setSubmitting(true)
    try {
      await imsService.createAdjustment({
        product: Number(form.product),
        location: Number(form.location),
        counted_quantity: Number(form.counted_quantity),
        notes: form.notes,
      })

      toast.success('Stock adjustment submitted.')
      setForm(initialForm)
      setSystemQuantity(0)
      setPage(1)
      setRefreshTrigger((value) => value + 1)
    } catch (requestError) {
      setFormError(extractErrorMessage(requestError, 'Unable to submit adjustment.'))
    } finally {
      setSubmitting(false)
    }
  }

  const exportAdjustments = async () => {
    setExporting(true)
    try {
      const response = await imsService.exportAdjustments()
      const fileName = downloadBlobResponse(response, 'adjustments_export.xlsx')
      toast.success(`Export complete: ${fileName}`)
    } catch (requestError) {
      toast.error(await extractDownloadErrorMessage(requestError, 'Unable to export adjustments.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <PageMotion className="space-y-5">
      <Card
        title="Create Stock Adjustment"
        description="Adjustments are applied immediately and posted to the stock ledger."
      >
        <form className="space-y-4" onSubmit={submitAdjustment}>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              id="adjust-product"
              label="Product"
              value={form.product}
              onChange={(event) => setForm((prev) => ({ ...prev, product: event.target.value }))}
              options={productOptions}
              placeholder="Select product"
            />
            <SelectField
              id="adjust-location"
              label="Location"
              value={form.location}
              onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
              options={locationOptions}
              placeholder="Select location"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              id="adjust-counted"
              label="Counted Quantity"
              type="number"
              min="0"
              value={form.counted_quantity}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  counted_quantity: event.target.value,
                }))
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-canvas/60 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.1em] text-muted">System Qty</p>
                <p className="text-xl font-semibold text-ink">{systemQuantity}</p>
              </div>
              <div className="rounded-xl border border-border bg-canvas/60 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.1em] text-muted">Difference</p>
                <p
                  className={`text-xl font-semibold ${
                    differencePreview < 0 ? 'text-red-600' : differencePreview > 0 ? 'text-emerald-600' : 'text-ink'
                  }`}
                >
                  {formatSignedNumber(differencePreview)}
                </p>
              </div>
            </div>
          </div>

          <InputField
            id="adjust-notes"
            label="Notes"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Reason for adjustment"
          />

          {formError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</p>
          )}

          <Button type="submit" loading={submitting}>
            <FiSliders /> Submit Adjustment
          </Button>
        </form>
      </Card>

      <Card
        title="Recent Adjustments"
        description="Monitor cycle count corrections and reconciliation outcomes."
        action={
          <Button variant="secondary" loading={exporting} onClick={exportAdjustments}>
            <FiDownload /> Export Excel
          </Button>
        }
      >
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <EmptyState title="Adjustments unavailable" description={error} />
        ) : adjustments.length === 0 ? (
          <EmptyState
            title="No adjustments yet"
            description="Create a stock adjustment when physical count differs from system quantity."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-muted">
                    <th className="px-3 py-3">Reference</th>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Location</th>
                    <th className="px-3 py-3">Counted</th>
                    <th className="px-3 py-3">System</th>
                    <th className="px-3 py-3">Difference</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Stock Update</th>
                    <th className="px-3 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((adjustment) => (
                    <tr key={adjustment.id} className="table-row-hover border-b border-border/70">
                      <td className="px-3 py-3 font-medium text-ink">{adjustment.reference_no}</td>
                      <td className="px-3 py-3 text-ink">{adjustment.product_name}</td>
                      <td className="px-3 py-3 text-muted">{adjustment.location_name}</td>
                      <td className="px-3 py-3 text-muted">{adjustment.counted_quantity}</td>
                      <td className="px-3 py-3 text-muted">{adjustment.system_quantity}</td>
                      <td
                        className={`px-3 py-3 font-semibold ${
                          adjustment.difference < 0
                            ? 'text-red-600'
                            : adjustment.difference > 0
                              ? 'text-emerald-600'
                              : 'text-ink'
                        }`}
                      >
                        {formatSignedNumber(adjustment.difference)}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge value={adjustment.status} />
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            adjustment.is_posted
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {adjustment.is_posted ? 'Applied' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted">{formatDateTime(adjustment.created_at)}</td>
                    </tr>
                  ))}
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