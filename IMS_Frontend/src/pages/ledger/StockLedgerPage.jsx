import { useEffect, useMemo, useState } from 'react'
import { FiDownload, FiFileText, FiSearch } from 'react-icons/fi'
import toast from 'react-hot-toast'

import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import { TableSkeleton } from '../../components/common/LoadingSkeleton'
import PageMotion from '../../components/common/PageMotion'
import PaginationControls from '../../components/common/PaginationControls'
import SelectField from '../../components/common/SelectField'
import StatusBadge from '../../components/common/StatusBadge'
import useDebounce from '../../hooks/useDebounce'
import { getCount, getResults, imsService } from '../../services/imsService'
import { downloadBlobResponse, extractDownloadErrorMessage } from '../../utils/download'
import { MOVEMENT_TYPE_OPTIONS, PAGE_SIZE } from '../../utils/constants'
import { formatDateTime, formatSignedNumber } from '../../utils/format'
import { extractErrorMessage } from '../../utils/http'

export default function StockLedgerPage() {
  const [entries, setEntries] = useState([])
  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [movementType, setMovementType] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const debouncedSearch = useDebounce(searchInput, 400)

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

    const loadLedger = async () => {
      setLoading(true)
      setError('')
      try {
        const payload = await imsService.listStockLedger({
          page,
          movement_type: movementType || undefined,
          product: productFilter || undefined,
          location: locationFilter || undefined,
          search: debouncedSearch || undefined,
        })

        if (!isMounted) {
          return
        }

        setEntries(getResults(payload))
        setTotalCount(getCount(payload))
      } catch (requestError) {
        if (isMounted) {
          setError(extractErrorMessage(requestError, 'Unable to load stock ledger.'))
          setEntries([])
          setTotalCount(0)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadLedger()

    return () => {
      isMounted = false
    }
  }, [page, movementType, productFilter, locationFilter, debouncedSearch])

  const exportLedger = async (format) => {
    const setLoadingState = format === 'pdf' ? setExportingPdf : setExportingExcel
    setLoadingState(true)

    try {
      const response = await imsService.exportLedger({
        file_format: format,
        movement_type: movementType || undefined,
        product: productFilter || undefined,
        location: locationFilter || undefined,
        search: searchInput.trim() || undefined,
      })
      const fallbackName = format === 'pdf' ? 'stock_ledger.pdf' : 'stock_ledger.xlsx'
      const fileName = downloadBlobResponse(response, fallbackName)
      toast.success(`Export complete: ${fileName}`)
    } catch (requestError) {
      toast.error(await extractDownloadErrorMessage(requestError, 'Unable to export stock ledger.'))
    } finally {
      setLoadingState(false)
    }
  }

  return (
    <PageMotion className="space-y-5">
      <Card
        title="Stock Ledger"
        description="Chronological movement history for every stock operation."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              loading={exportingExcel}
              disabled={exportingPdf}
              onClick={() => exportLedger('xlsx')}
            >
              <FiDownload /> Export Excel
            </Button>
            <Button
              variant="secondary"
              loading={exportingPdf}
              disabled={exportingExcel}
              onClick={() => exportLedger('pdf')}
            >
              <FiFileText /> Export PDF
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 xl:grid-cols-4">
          <label className="relative xl:col-span-2">
            <FiSearch className="pointer-events-none absolute left-3 top-3 text-muted" />
            <input
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value)
                setPage(1)
              }}
              placeholder="Search by reference, note, product name, or SKU"
              className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-3 text-sm"
            />
          </label>

          <SelectField
            id="movement-type"
            value={movementType}
            onChange={(event) => {
              setMovementType(event.target.value)
              setPage(1)
            }}
            options={MOVEMENT_TYPE_OPTIONS}
            placeholder="All movement types"
          />

          <SelectField
            id="ledger-product"
            value={productFilter}
            onChange={(event) => {
              setProductFilter(event.target.value)
              setPage(1)
            }}
            options={productOptions}
            placeholder="All products"
          />

          <SelectField
            id="ledger-location"
            value={locationFilter}
            onChange={(event) => {
              setLocationFilter(event.target.value)
              setPage(1)
            }}
            options={locationOptions}
            placeholder="All locations"
          />
        </div>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <EmptyState title="Stock ledger unavailable" description={error} />
        ) : entries.length === 0 ? (
          <EmptyState title="No ledger entries" description="Stock movements will appear here once transactions are posted." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-muted">
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Location</th>
                    <th className="px-3 py-3">Change</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Reference</th>
                    <th className="px-3 py-3">User</th>
                    <th className="px-3 py-3">Note</th>
                    <th className="px-3 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="table-row-hover border-b border-border/70">
                      <td className="px-3 py-3 text-ink">{entry.product_name}</td>
                      <td className="px-3 py-3 text-muted">{entry.location_name || '-'}</td>
                      <td
                        className={`px-3 py-3 font-semibold ${
                          entry.change < 0 ? 'text-red-600' : entry.change > 0 ? 'text-emerald-600' : 'text-ink'
                        }`}
                      >
                        {formatSignedNumber(entry.change)}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge value={entry.movement_type} />
                      </td>
                      <td className="px-3 py-3 font-medium text-ink">{entry.reference_id}</td>
                      <td className="px-3 py-3 text-muted">{entry.user || '-'}</td>
                      <td className="max-w-[240px] px-3 py-3 text-muted">{entry.note || '-'}</td>
                      <td className="px-3 py-3 text-muted">{formatDateTime(entry.created_at)}</td>
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