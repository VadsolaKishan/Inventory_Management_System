import { useEffect, useMemo, useState } from 'react'
import { FiAlertTriangle } from 'react-icons/fi'

import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import { TableSkeleton } from '../../components/common/LoadingSkeleton'
import PageMotion from '../../components/common/PageMotion'
import PaginationControls from '../../components/common/PaginationControls'
import SelectField from '../../components/common/SelectField'
import { getCount, getResults, imsService } from '../../services/imsService'
import { PAGE_SIZE } from '../../utils/constants'
import { extractErrorMessage } from '../../utils/http'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [categories, setCategories] = useState([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [outOfStockOnly, setOutOfStockOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const warehouseOptions = useMemo(
    () => warehouses.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })),
    [warehouses],
  )
  const categoryOptions = useMemo(
    () => categories.map((item) => ({ value: item.id, label: item.name })),
    [categories],
  )

  useEffect(() => {
    let isMounted = true

    const loadFilters = async () => {
      try {
        const [warehouseRecords, categoryRecords] = await Promise.all([
          imsService.listAllWarehouses(),
          imsService.listAllCategories(),
        ])

        if (!isMounted) {
          return
        }

        setWarehouses(warehouseRecords)
        setCategories(categoryRecords)
      } catch {
        if (isMounted) {
          setWarehouses([])
          setCategories([])
        }
      }
    }

    loadFilters()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadAlerts = async () => {
      setLoading(true)
      setError('')

      try {
        const payload = await imsService.getAlerts({
          page,
          warehouse: warehouseFilter || undefined,
          category: categoryFilter || undefined,
          out_of_stock: outOfStockOnly ? 'true' : undefined,
        })

        if (!isMounted) {
          return
        }

        setAlerts(getResults(payload))
        setTotalCount(getCount(payload))
      } catch (requestError) {
        if (isMounted) {
          setError(extractErrorMessage(requestError, 'Unable to load alerts.'))
          setAlerts([])
          setTotalCount(0)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadAlerts()

    return () => {
      isMounted = false
    }
  }, [page, warehouseFilter, categoryFilter, outOfStockOnly])

  return (
    <PageMotion className="space-y-5">
      <Card title="Low Stock Alert Center" description="Monitor products approaching reorder levels.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SelectField
            id="alert-warehouse"
            label="Warehouse"
            value={warehouseFilter}
            onChange={(event) => {
              setWarehouseFilter(event.target.value)
              setPage(1)
            }}
            options={warehouseOptions}
            placeholder="All warehouses"
          />
          <SelectField
            id="alert-category"
            label="Category"
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value)
              setPage(1)
            }}
            options={categoryOptions}
            placeholder="All categories"
          />
          <label className="mt-6 inline-flex h-fit items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={outOfStockOnly}
              onChange={(event) => {
                setOutOfStockOnly(event.target.checked)
                setPage(1)
              }}
              className="rounded border-border"
            />
            Show only out-of-stock
          </label>
        </div>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <EmptyState title="Alerts unavailable" description={error} />
        ) : alerts.length === 0 ? (
          <EmptyState
            title="No active alerts"
            description="Great news, all tracked products are above their alert thresholds."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-muted">
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">SKU</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Current Stock</th>
                    <th className="px-3 py-3">Reorder Level</th>
                    <th className="px-3 py-3">Shortage</th>
                    <th className="px-3 py-3">Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="table-row-hover border-b border-border/70">
                      <td className="px-3 py-3 text-ink">{alert.name}</td>
                      <td className="px-3 py-3 font-medium text-ink">{alert.sku}</td>
                      <td className="px-3 py-3 text-muted">{alert.category_name || '-'}</td>
                      <td className="px-3 py-3 text-muted">{alert.current_stock}</td>
                      <td className="px-3 py-3 text-muted">{alert.reorder_level}</td>
                      <td className="px-3 py-3 font-semibold text-rose-600">{alert.shortage}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            alert.is_out_of_stock
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          <FiAlertTriangle />
                          {alert.is_out_of_stock ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </td>
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