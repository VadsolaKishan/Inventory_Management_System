import { FiPlus, FiTrash2 } from 'react-icons/fi'

import Button from '../common/Button'
import SelectField from '../common/SelectField'

function buildOptionLabel(product, stockByProduct, stockLabel) {
  const hasStockMap = stockByProduct && typeof stockByProduct === 'object'
  const mappedStock =
    hasStockMap
      ? Number(stockByProduct[String(product.id)] || 0)
      : Number(product.current_stock)
  const hasStock = Number.isFinite(mappedStock)
  const stock = hasStock ? ` | ${stockLabel}: ${mappedStock}` : ''
  return `${product.name} (${product.sku})${stock}`
}

export default function DocumentItemsEditor({
  items,
  products,
  onChange,
  stockByProduct = null,
  stockLabel = 'Stock',
  visibleProductIds = null,
}) {
  const visibleSet = Array.isArray(visibleProductIds)
    ? new Set(visibleProductIds.map((id) => String(id)))
    : null
  const productsToRender = visibleSet
    ? products.filter((product) => visibleSet.has(String(product.id)))
    : products
  const productOptions = productsToRender.map((product) => ({
    value: product.id,
    label: buildOptionLabel(product, stockByProduct, stockLabel),
  }))

  const updateItem = (index, field, value) => {
    const nextItems = items.map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            [field]: field === 'quantity' ? Number(value) : value,
          }
        : item,
    )
    onChange(nextItems)
  }

  const addItem = () => {
    onChange([...items, { product: '', quantity: 1 }])
  }

  const removeItem = (index) => {
    onChange(items.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={`item-row-${index}`}
          className="grid gap-3 rounded-xl border border-border bg-canvas/50 p-3 md:grid-cols-[1fr_130px_auto]"
        >
          <SelectField
            id={`document-item-product-${index}`}
            value={item.product}
            onChange={(event) => updateItem(index, 'product', event.target.value)}
            options={productOptions}
            placeholder="Select product"
          />

          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(event) => updateItem(index, 'quantity', event.target.value)}
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
            placeholder="Qty"
          />

          <Button variant="ghost" className="justify-center" onClick={() => removeItem(index)}>
            <FiTrash2 /> Remove
          </Button>
        </div>
      ))}

      <Button variant="secondary" size="sm" onClick={addItem}>
        <FiPlus /> Add Item
      </Button>
    </div>
  )
}