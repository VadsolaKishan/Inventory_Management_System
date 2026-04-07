import { useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { FiDownload, FiEdit2, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi'
import toast from 'react-hot-toast'

import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import InputField from '../../components/common/InputField'
import { TableSkeleton } from '../../components/common/LoadingSkeleton'
import Modal from '../../components/common/Modal'
import PageMotion from '../../components/common/PageMotion'
import PaginationControls from '../../components/common/PaginationControls'
import SelectField from '../../components/common/SelectField'
import { downloadBlobResponse, extractDownloadErrorMessage } from '../../utils/download'
import { setAlertCount } from '../../store/slices/uiSlice'
import { PAGE_SIZE } from '../../utils/constants'
import { extractErrorMessage } from '../../utils/http'
import { getCount, getResults, imsService } from '../../services/imsService'
import useDebounce from '../../hooks/useDebounce'

const initialForm = {
  name: '',
  sku: '',
  category: '',
  unit_of_measure: '',
  reorder_level: 0,
}

export default function ProductsPage() {
  const dispatch = useDispatch()

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [exporting, setExporting] = useState(false)

  const debouncedSearch = useDebounce(searchInput, 400)

  const categoryOptions = useMemo(
    () => categories.map((item) => ({ value: item.id, label: item.name })),
    [categories],
  )

  useEffect(() => {
    let isMounted = true

    const fetchCategories = async () => {
      try {
        const payload = await imsService.listCategories({ page: 1, page_size: PAGE_SIZE })
        if (isMounted) {
          setCategories(getResults(payload))
        }
      } catch {
        if (isMounted) {
          setCategories([])
        }
      }
    }

    fetchCategories()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadProducts = async () => {
      setLoading(true)
      setError('')

      try {
        const payload = await imsService.listProducts({
          page,
          page_size: PAGE_SIZE,
          search: debouncedSearch || undefined,
          category: categoryFilter || undefined,
        })

        if (!isMounted) {
          return
        }

        setProducts(getResults(payload))
        setTotalCount(getCount(payload))
      } catch (requestError) {
        if (isMounted) {
          setError(extractErrorMessage(requestError, 'Unable to load products.'))
          setProducts([])
          setTotalCount(0)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      isMounted = false
    }
  }, [page, debouncedSearch, categoryFilter, refreshTrigger])

  const resetForm = () => {
    setForm(initialForm)
    setEditingProduct(null)
    setFormError('')
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (product) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      unit_of_measure: product.unit_of_measure,
      reorder_level: product.reorder_level,
    })
    setFormError('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    resetForm()
  }

  const refreshAlertBadge = async () => {
    try {
      const payload = await imsService.getAlerts({ page: 1, page_size: 1 })
      dispatch(setAlertCount(getCount(payload)))
    } catch {
      // Keep previous badge value if the alert poll fails temporarily.
    }
  }

  const submitForm = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!form.name || !form.sku || !form.category || !form.unit_of_measure) {
      setFormError('Name, SKU, category, and unit of measure are required.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...form,
        category: Number(form.category),
        reorder_level: Number(form.reorder_level || 0),
      }

      if (editingProduct) {
        await imsService.updateProduct(editingProduct.id, payload)
        toast.success('Product updated successfully.')
      } else {
        await imsService.createProduct(payload)
        toast.success('Product created successfully.')
      }

      await refreshAlertBadge()

      closeModal()
      setPage(1)
      setSearchInput('')
      setRefreshTrigger((value) => value + 1)
    } catch (requestError) {
      setFormError(extractErrorMessage(requestError, 'Unable to save product.'))
    } finally {
      setSubmitting(false)
    }
  }

  const deleteProduct = async (product) => {
    const confirmDelete = window.confirm(`Delete product ${product.name}?`)
    if (!confirmDelete) {
      return
    }

    try {
      await imsService.deleteProduct(product.id)
      toast.success('Product deleted.')
      await refreshAlertBadge()
      setPage(1)
      setRefreshTrigger((value) => value + 1)
    } catch (requestError) {
      toast.error(extractErrorMessage(requestError, 'Unable to delete product.'))
    }
  }

  const exportProducts = async () => {
    setExporting(true)
    try {
      const response = await imsService.exportProducts({
        search: searchInput.trim() || undefined,
        category: categoryFilter || undefined,
      })
      const fileName = downloadBlobResponse(response, 'products_export.xlsx')
      toast.success(`Export complete: ${fileName}`)
    } catch (requestError) {
      toast.error(await extractDownloadErrorMessage(requestError, 'Unable to export products.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <PageMotion className="space-y-5">
      <Card
        title="Product Catalog"
        description="Manage SKU details, stock policy levels, and category organization."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" loading={exporting} onClick={exportProducts}>
              <FiDownload /> Export Excel
            </Button>
            <Button onClick={openCreateModal}>
              <FiPlus /> Add Product
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-4">
          <label className="relative min-w-[260px] flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-3 text-muted" />
            <input
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value)
                setPage(1)
              }}
              placeholder="Search by SKU or product name"
              className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-3 text-sm"
            />
          </label>

          <SelectField
            id="category-filter"
            aria-label="Category filter"
            className="w-full sm:w-[280px]"
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value)
              setPage(1)
            }}
            options={categoryOptions}
            placeholder="All categories"
          />
        </div>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <EmptyState title="Products unavailable" description={error} />
        ) : products.length === 0 ? (
          <EmptyState
            title="No products found"
            description="Adjust filters or add the first product to start tracking inventory."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-muted">
                    <th className="px-3 py-3">SKU</th>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">UOM</th>
                    <th className="px-3 py-3">Current Stock</th>
                    <th className="px-3 py-3">Reorder Level</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="table-row-hover border-b border-border/70">
                      <td className="px-3 py-3 font-medium text-ink">{product.sku}</td>
                      <td className="px-3 py-3 text-ink">{product.name}</td>
                      <td className="px-3 py-3 text-muted">{product.category_name}</td>
                      <td className="px-3 py-3 text-muted">{product.unit_of_measure}</td>
                      <td className="px-3 py-3 text-ink">{product.current_stock}</td>
                      <td className="px-3 py-3 text-muted">{product.reorder_level}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openEditModal(product)}>
                            <FiEdit2 /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteProduct(product)}>
                            <FiTrash2 /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationControls
              page={page}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
      >
        <form className="space-y-4" onSubmit={submitForm}>
          <InputField
            id="name"
            label="Product Name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <InputField
            id="sku"
            label="SKU"
            value={form.sku}
            onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
          />

          <SelectField
            id="category"
            label="Category"
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            options={categoryOptions}
            placeholder="Select category"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id="unit"
              label="Unit of Measure"
              value={form.unit_of_measure}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  unit_of_measure: event.target.value,
                }))
              }
              placeholder="pcs"
            />
            <InputField
              id="reorder"
              label="Reorder Level"
              type="number"
              min="0"
              value={form.reorder_level}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  reorder_level: event.target.value,
                }))
              }
            />
          </div>

          {formError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>
    </PageMotion>
  )
}