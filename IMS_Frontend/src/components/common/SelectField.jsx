import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { FiChevronDown } from 'react-icons/fi'

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

export default function SelectField({
  id,
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  error,
  className,
  disabled = false,
  name,
  menuPlacement = 'auto',
  ...props
}) {
  const containerRef = useRef(null)
  const menuRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 240,
  })

  const normalizedValue = normalizeValue(value)
  const normalizedOptions = useMemo(
    () =>
      options.map((option) => ({
        ...option,
        value: normalizeValue(option.value),
      })),
    [options],
  )
  const selectedOption = normalizedOptions.find((option) => option.value === normalizedValue)

  const updateMenuPosition = () => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }

    const viewportPadding = 8
    const gap = 6
    const optionCount = normalizedOptions.length + 1
    const idealHeight = Math.min(248, Math.max(96, optionCount * 38 + 8))

    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
    const spaceAbove = rect.top - viewportPadding

    const shouldOpenUpward =
      menuPlacement === 'top'
        ? true
        : menuPlacement === 'bottom'
          ? false
          : spaceBelow < idealHeight && spaceAbove > spaceBelow
    const computedMaxHeight = Math.max(
      80,
      shouldOpenUpward ? spaceAbove - gap : spaceBelow - gap,
    )
    const menuHeight = Math.min(idealHeight, computedMaxHeight)

    setOpenUpward(shouldOpenUpward)
    setMenuPosition({
      top: shouldOpenUpward ? rect.top - menuHeight - gap : rect.bottom + gap,
      left: rect.left,
      width: rect.width,
      maxHeight: menuHeight,
    })
  }

  const toggleOpen = () => {
    if (disabled) {
      return
    }

    if (!open) {
      updateMenuPosition()
    }

    setOpen((prev) => !prev)
  }

  const emitChange = (nextValue) => {
    if (!onChange) {
      return
    }

    onChange({
      target: {
        value: nextValue,
        id,
        name: name || id,
      },
    })
  }

  const selectValue = (nextValue) => {
    emitChange(nextValue)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) {
      return undefined
    }

    updateMenuPosition()

    const handlePointerDown = (event) => {
      const clickedInsideTrigger = containerRef.current?.contains(event.target)
      const clickedInsideMenu = menuRef.current?.contains(event.target)
      if (!clickedInsideTrigger && !clickedInsideMenu) {
        setOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    const handleViewportChange = () => {
      updateMenuPosition()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [open, menuPlacement, normalizedOptions.length])

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          className={clsx(
            'fixed z-[9999] rounded-xl border border-border bg-white shadow-card',
            openUpward && 'origin-bottom',
          )}
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            width: `${menuPosition.width}px`,
          }}
        >
          <ul role="listbox" className="overflow-auto py-1" style={{ maxHeight: `${menuPosition.maxHeight}px` }}>
            <li>
              <button
                type="button"
                className={clsx(
                  'w-full truncate px-3.5 py-2 text-left text-sm transition-colors',
                  normalizedValue === ''
                    ? 'bg-brand-50 font-medium text-brand-700'
                    : 'text-muted hover:bg-canvas',
                )}
                onClick={() => selectValue('')}
              >
                {placeholder}
              </button>
            </li>
            {normalizedOptions.map((option) => (
              <li key={`${option.value}`}>
                <button
                  type="button"
                  className={clsx(
                    'w-full truncate px-3.5 py-2 text-left text-sm transition-colors',
                    normalizedValue === option.value
                      ? 'bg-brand-50 font-medium text-brand-700'
                      : 'text-ink hover:bg-canvas',
                  )}
                  onClick={() => selectValue(option.value)}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>,
        document.body,
      )
    : null

  return (
    <label className={clsx('flex flex-col gap-1.5 text-sm', className)} htmlFor={id}>
      {label && <span className="font-semibold text-ink">{label}</span>}
      <div ref={containerRef} className="relative">
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={clsx(
            'flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm',
            'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
            disabled && 'cursor-not-allowed bg-canvas text-muted',
            error && 'border-red-300 focus:border-red-500 focus:ring-red-100',
          )}
          onClick={toggleOpen}
          {...props}
        >
          <span
            className={clsx(
              'truncate text-left',
              selectedOption ? 'text-ink' : 'text-muted',
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <FiChevronDown className={clsx('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {menu}
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </label>
  )
}