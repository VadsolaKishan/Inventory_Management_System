import { useEffect, useMemo, useState } from 'react'
import { FiAlertTriangle, FiBox, FiClipboard, FiPackage, FiTruck } from 'react-icons/fi'

import Card from '../components/common/Card'
import EmptyState from '../components/common/EmptyState'
import PageMotion from '../components/common/PageMotion'
import SelectField from '../components/common/SelectField'
import { CardSkeleton } from '../components/common/LoadingSkeleton'
import DocumentChart from '../components/dashboard/DocumentChart'
import StatCard from '../components/dashboard/StatCard'
import useDebounce from '../hooks/useDebounce'
import { getResults, imsService } from '../services/imsService'
import {
  DASHBOARD_ALL_STATUS_OPTIONS,
  DASHBOARD_DOCUMENT_OPTIONS,
  DASHBOARD_STATUS_OPTIONS_BY_DOCUMENT_TYPE,
  PAGE_SIZE,
} from '../utils/constants'
import { extractErrorMessage } from '../utils/http'

const initialFilters = {
  document_type: '',
  status: '',
  warehouse: '',
  category: '',
}

let dashboardLookupsCache = null

export default function DashboardPage() {
  const [filters, setFilters] = useState(initialFilters)
  const debouncedFilters = useDebounce(filters, 250)
  const [dashboard, setDashboard] = useState(null)
  const [warehouses, setWarehouses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const dashboardParams = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(debouncedFilters).filter(([, value]) => value !== '' && value !== null),
      ),
    [debouncedFilters],
  )

  useEffect(() => {
    let isMounted = true

    const loadLookups = async () => {
      if (dashboardLookupsCache) {
        setWarehouses(dashboardLookupsCache.warehouses)
        setCategories(dashboardLookupsCache.categories)
        return
      }

      try {
        const [warehousePayload, categoryPayload] = await Promise.all([
          imsService.listWarehouses({ page: 1, page_size: PAGE_SIZE }),
          imsService.listCategories({ page: 1, page_size: PAGE_SIZE }),
        ])

        if (!isMounted) {
          return
        }

        const nextWarehouses = getResults(warehousePayload)
        const nextCategories = getResults(categoryPayload)

        dashboardLookupsCache = {
          warehouses: nextWarehouses,
          categories: nextCategories,
        }

        setWarehouses(nextWarehouses)
        setCategories(nextCategories)
      } catch (requestError) {
        if (isMounted) {
          setError(extractErrorMessage(requestError, 'Unable to load dashboard filter options.'))
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

    const loadDashboard = async () => {
      setLoading(true)
      setError('')

      try {
        const dashboardPayload = await imsService.getDashboard(dashboardParams)

        if (!isMounted) {
          return
        }

        setDashboard(dashboardPayload)
      } catch (requestError) {
        if (isMounted) {
          setError(extractErrorMessage(requestError, 'Unable to load dashboard data.'))
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [dashboardParams])

  const warehouseOptions = useMemo(
    () => warehouses.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })),
    [warehouses],
  )
  const categoryOptions = useMemo(
    () => categories.map((item) => ({ value: item.id, label: item.name })),
    [categories],
  )
  const statusOptions = useMemo(() => {
    if (!filters.document_type) {
      return DASHBOARD_ALL_STATUS_OPTIONS
    }
    return DASHBOARD_STATUS_OPTIONS_BY_DOCUMENT_TYPE[filters.document_type] || DASHBOARD_ALL_STATUS_OPTIONS
  }, [filters.document_type])

  const totals = dashboard?.totals || {}
  const pending = dashboard?.pending || {}

  return (
    <PageMotion className="space-y-5">
      <Card title="Dashboard Filters" description="Segment metrics by workflow, status, warehouse, or category.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SelectField
            id="document_type"
            label="Document Type"
            value={filters.document_type}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                document_type: event.target.value,
                status: '',
              }))
            }
            options={DASHBOARD_DOCUMENT_OPTIONS}
            placeholder="All document types"
          />
          <SelectField
            id="status"
            label="Status"
            value={filters.status}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                status: event.target.value,
              }))
            }
            options={statusOptions}
            placeholder="All statuses"
          />
          <SelectField
            id="warehouse"
            label="Warehouse"
            value={filters.warehouse}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                warehouse: event.target.value,
              }))
            }
            options={warehouseOptions}
            placeholder="All warehouses"
          />
          <SelectField
            id="category"
            label="Category"
            value={filters.category}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                category: event.target.value,
              }))
            }
            options={categoryOptions}
            placeholder="All categories"
          />
        </div>
      </Card>

      {loading ? (
        <CardSkeleton count={4} />
      ) : error ? (
        <EmptyState title="Dashboard unavailable" description={error} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Products In Stock"
              value={totals.products_in_stock || 0}
              subtitle="Distinct SKUs available"
              icon={FiPackage}
              accentClass="bg-brand-600"
            />
            <StatCard
              title="Units In Stock"
              value={totals.units_in_stock || 0}
              subtitle="Total units across all locations"
              icon={FiBox}
              accentClass="bg-cyan-600"
            />
            <StatCard
              title="Low Stock Items"
              value={totals.low_stock || 0}
              subtitle="At or below reorder level"
              icon={FiAlertTriangle}
              accentClass="bg-amber-500"
            />
            <StatCard
              title="Out of Stock"
              value={totals.out_of_stock || 0}
              subtitle="Requires immediate replenishment"
              icon={FiTruck}
              accentClass="bg-rose-500"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <DocumentChart documents={dashboard?.documents} />

            <Card
              title="Pending Workload"
              description="Documents still in draft, waiting, or ready stages."
            >
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-canvas/70 px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-muted">
                    <FiClipboard /> Receipts
                  </span>
                  <strong className="text-ink">{pending.receipts || 0}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-canvas/70 px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-muted">
                    <FiTruck /> Deliveries
                  </span>
                  <strong className="text-ink">{pending.deliveries || 0}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-canvas/70 px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-muted">
                    <FiPackage /> Internal Transfers
                  </span>
                  <strong className="text-ink">{pending.internal_transfers || 0}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-canvas/70 px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-muted">
                    <FiAlertTriangle /> Adjustments
                  </span>
                  <strong className="text-ink">{pending.adjustments || 0}</strong>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </PageMotion>
  )
}