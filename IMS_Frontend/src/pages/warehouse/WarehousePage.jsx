import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiMapPin, FiPlus } from 'react-icons/fi'
import toast from 'react-hot-toast'

import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import InputField from '../../components/common/InputField'
import { TableSkeleton } from '../../components/common/LoadingSkeleton'
import Modal from '../../components/common/Modal'
import PageMotion from '../../components/common/PageMotion'
import SelectField from '../../components/common/SelectField'
import { PAGE_SIZE } from '../../utils/constants'
import { extractErrorMessage } from '../../utils/http'
import { getResults, imsService } from '../../services/imsService'

const initialWarehouseForm = {
  name: '',
  code: '',
  address: '',
  is_active: true,
}

const initialLocationForm = {
  warehouse: '',
  name: '',
  code: '',
  is_active: true,
}

export default function WarehousePage() {
  const [warehouses, setWarehouses] = useState([])
  const [locations, setLocations] = useState([])
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false)
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState(null)
  const [editingLocation, setEditingLocation] = useState(null)
  const [warehouseForm, setWarehouseForm] = useState(initialWarehouseForm)
  const [locationForm, setLocationForm] = useState(initialLocationForm)
  const [warehouseFormError, setWarehouseFormError] = useState('')
  const [locationFormError, setLocationFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const warehouseOptions = useMemo(
    () => warehouses.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })),
    [warehouses],
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [warehousePayload, locationPayload] = await Promise.all([
        imsService.listWarehouses({ page: 1, page_size: PAGE_SIZE }),
        imsService.listLocations({
          page: 1,
          page_size: PAGE_SIZE,
          warehouse: warehouseFilter || undefined,
        }),
      ])

      setWarehouses(getResults(warehousePayload))
      setLocations(getResults(locationPayload))
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Unable to load warehouse data.'))
      setWarehouses([])
      setLocations([])
    } finally {
      setLoading(false)
    }
  }, [warehouseFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openWarehouseModal = (warehouse = null) => {
    if (warehouse) {
      setEditingWarehouse(warehouse)
      setWarehouseForm({
        name: warehouse.name,
        code: warehouse.code,
        address: warehouse.address,
        is_active: warehouse.is_active,
      })
    } else {
      setEditingWarehouse(null)
      setWarehouseForm(initialWarehouseForm)
    }

    setWarehouseFormError('')
    setWarehouseModalOpen(true)
  }

  const openLocationModal = (location = null) => {
    if (location) {
      setEditingLocation(location)
      setLocationForm({
        warehouse: location.warehouse,
        name: location.name,
        code: location.code,
        is_active: location.is_active,
      })
    } else {
      setEditingLocation(null)
      setLocationForm({ ...initialLocationForm, warehouse: warehouseFilter || '' })
    }

    setLocationFormError('')
    setLocationModalOpen(true)
  }

  const submitWarehouse = async (event) => {
    event.preventDefault()
    setWarehouseFormError('')

    if (!warehouseForm.name || !warehouseForm.code) {
      setWarehouseFormError('Warehouse name and code are required.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...warehouseForm,
        is_active: Boolean(warehouseForm.is_active),
      }

      if (editingWarehouse) {
        await imsService.updateWarehouse(editingWarehouse.id, payload)
        toast.success('Warehouse updated.')
      } else {
        await imsService.createWarehouse(payload)
        toast.success('Warehouse created.')
      }

      setWarehouseModalOpen(false)
      await loadData()
    } catch (requestError) {
      setWarehouseFormError(extractErrorMessage(requestError, 'Unable to save warehouse.'))
    } finally {
      setSubmitting(false)
    }
  }

  const submitLocation = async (event) => {
    event.preventDefault()
    setLocationFormError('')

    if (!locationForm.warehouse || !locationForm.name || !locationForm.code) {
      setLocationFormError('Warehouse, name, and code are required for location.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...locationForm,
        warehouse: Number(locationForm.warehouse),
        is_active: Boolean(locationForm.is_active),
      }

      if (editingLocation) {
        await imsService.updateLocation(editingLocation.id, payload)
        toast.success('Location updated.')
      } else {
        await imsService.createLocation(payload)
        toast.success('Location created.')
      }

      setLocationModalOpen(false)
      await loadData()
    } catch (requestError) {
      setLocationFormError(extractErrorMessage(requestError, 'Unable to save location.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageMotion className="space-y-5">
      {error && <EmptyState title="Warehouse module error" description={error} />}

      <Card
        title="Warehouses"
        description="Manage warehouse identity, status, and addressing details."
        action={
          <Button onClick={() => openWarehouseModal()}>
            <FiPlus /> Add Warehouse
          </Button>
        }
      >
        {loading ? (
          <TableSkeleton rows={5} />
        ) : warehouses.length === 0 ? (
          <EmptyState
            title="No warehouses configured"
            description="Create your first warehouse to start location mapping."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-muted">
                  <th className="px-3 py-3">Code</th>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Address</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="table-row-hover border-b border-border/70">
                    <td className="px-3 py-3 font-medium text-ink">{warehouse.code}</td>
                    <td className="px-3 py-3 text-ink">{warehouse.name}</td>
                    <td className="px-3 py-3 text-muted">{warehouse.address || '-'}</td>
                    <td className="px-3 py-3 text-muted">
                      {warehouse.is_active ? 'Active' : 'Inactive'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button variant="secondary" size="sm" onClick={() => openWarehouseModal(warehouse)}>
                        <FiEdit2 /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Locations"
        description="Assign physical bins/aisles/rooms under each warehouse."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SelectField
              id="warehouse-filter"
              value={warehouseFilter}
              onChange={(event) => setWarehouseFilter(event.target.value)}
              options={warehouseOptions}
              placeholder="All warehouses"
              className="min-w-[220px]"
            />
            <Button onClick={() => openLocationModal()}>
              <FiMapPin /> Add Location
            </Button>
          </div>
        }
      >
        {loading ? (
          <TableSkeleton rows={5} />
        ) : locations.length === 0 ? (
          <EmptyState
            title="No locations available"
            description="Create a location and map it to a warehouse."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-muted">
                  <th className="px-3 py-3">Warehouse</th>
                  <th className="px-3 py-3">Location</th>
                  <th className="px-3 py-3">Code</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((location) => (
                  <tr key={location.id} className="table-row-hover border-b border-border/70">
                    <td className="px-3 py-3 text-ink">{location.warehouse_name}</td>
                    <td className="px-3 py-3 text-ink">{location.name}</td>
                    <td className="px-3 py-3 font-medium text-ink">{location.code}</td>
                    <td className="px-3 py-3 text-muted">
                      {location.is_active ? 'Active' : 'Inactive'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button variant="secondary" size="sm" onClick={() => openLocationModal(location)}>
                        <FiEdit2 /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={warehouseModalOpen}
        onClose={() => setWarehouseModalOpen(false)}
        title={editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
      >
        <form className="space-y-4" onSubmit={submitWarehouse}>
          <InputField
            id="warehouse-name"
            label="Warehouse Name"
            value={warehouseForm.name}
            onChange={(event) => setWarehouseForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <InputField
            id="warehouse-code"
            label="Code"
            value={warehouseForm.code}
            onChange={(event) => setWarehouseForm((prev) => ({ ...prev, code: event.target.value }))}
          />
          <InputField
            id="warehouse-address"
            label="Address"
            value={warehouseForm.address}
            onChange={(event) => setWarehouseForm((prev) => ({ ...prev, address: event.target.value }))}
          />
          <SelectField
            id="warehouse-status"
            label="Status"
            value={warehouseForm.is_active ? 'true' : 'false'}
            onChange={(event) =>
              setWarehouseForm((prev) => ({
                ...prev,
                is_active: event.target.value === 'true',
              }))
            }
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
            placeholder="Select status"
            menuPlacement="top"
          />

          {warehouseFormError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {warehouseFormError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setWarehouseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingWarehouse ? 'Save Changes' : 'Create Warehouse'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        title={editingLocation ? 'Edit Location' : 'Add Location'}
      >
        <form className="space-y-4" onSubmit={submitLocation}>
          <SelectField
            id="location-warehouse"
            label="Warehouse"
            value={locationForm.warehouse}
            onChange={(event) =>
              setLocationForm((prev) => ({
                ...prev,
                warehouse: event.target.value,
              }))
            }
            options={warehouseOptions}
            placeholder="Select warehouse"
          />
          <InputField
            id="location-name"
            label="Location Name"
            value={locationForm.name}
            onChange={(event) => setLocationForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <InputField
            id="location-code"
            label="Code"
            value={locationForm.code}
            onChange={(event) => setLocationForm((prev) => ({ ...prev, code: event.target.value }))}
          />
          <SelectField
            id="location-status"
            label="Status"
            value={locationForm.is_active ? 'true' : 'false'}
            onChange={(event) =>
              setLocationForm((prev) => ({
                ...prev,
                is_active: event.target.value === 'true',
              }))
            }
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
            placeholder="Select status"
            menuPlacement="top"
          />

          {locationFormError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {locationFormError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setLocationModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingLocation ? 'Save Changes' : 'Create Location'}
            </Button>
          </div>
        </form>
      </Modal>
    </PageMotion>
  )
}