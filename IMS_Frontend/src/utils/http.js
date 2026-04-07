function flattenErrorObject(payload) {
  if (payload === null || payload === undefined) {
    return []
  }

  if (typeof payload === 'string' || typeof payload === 'number' || typeof payload === 'boolean') {
    return [String(payload)]
  }

  if (Array.isArray(payload)) {
    return payload.flatMap((item) => flattenErrorObject(item))
  }

  if (typeof payload !== 'object') {
    return []
  }

  return Object.entries(payload).flatMap(([key, value]) => {
    if (key === 'detail') {
      return flattenErrorObject(value)
    }
    if (key === 'non_field_errors') {
      return flattenErrorObject(value)
    }
    return flattenErrorObject(value)
  })
}

export function extractErrorMessage(error, fallback = 'Something went wrong.') {
  if (!error) {
    return fallback
  }

  if (typeof error === 'string') {
    return error
  }

  const payload = error.response?.data

  if (!payload) {
    return error.message || fallback
  }

  if (typeof payload === 'string') {
    return payload
  }

  if (payload.detail) {
    return payload.detail
  }

  const lines = flattenErrorObject(payload)
  if (lines.length > 0) {
    return lines.join(' ')
  }

  return fallback
}