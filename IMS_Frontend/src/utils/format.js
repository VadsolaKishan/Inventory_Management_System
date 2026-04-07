export function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatNumber(value) {
  const safeValue = Number(value ?? 0)
  return new Intl.NumberFormat('en-US').format(Number.isNaN(safeValue) ? 0 : safeValue)
}

export function formatSignedNumber(value) {
  const safeValue = Number(value ?? 0)
  if (Number.isNaN(safeValue)) {
    return '0'
  }
  if (safeValue > 0) {
    return `+${safeValue}`
  }
  return `${safeValue}`
}