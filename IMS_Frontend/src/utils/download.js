import { extractErrorMessage } from './http'

function parseDispositionFilename(dispositionValue) {
  if (!dispositionValue || typeof dispositionValue !== 'string') {
    return ''
  }

  const encodedMatch = dispositionValue.match(/filename\*=UTF-8''([^;]+)/i)
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1])
    } catch {
      return encodedMatch[1]
    }
  }

  const basicMatch = dispositionValue.match(/filename="?([^";]+)"?/i)
  return basicMatch?.[1] || ''
}

export function downloadBlobResponse(response, fallbackFileName) {
  const disposition = response?.headers?.['content-disposition']
  const fileName = parseDispositionFilename(disposition) || fallbackFileName
  const blob = response?.data

  if (!(blob instanceof Blob)) {
    throw new Error('Download payload is invalid.')
  }

  const fileUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = fileUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(fileUrl)

  return fileName
}

export async function extractDownloadErrorMessage(error, fallback = 'Unable to export data.') {
  const payload = error?.response?.data

  if (payload instanceof Blob) {
    try {
      const text = await payload.text()
      if (!text) {
        return fallback
      }

      try {
        const parsed = JSON.parse(text)
        if (parsed?.detail) {
          return parsed.detail
        }
        return extractErrorMessage({ response: { data: parsed } }, fallback)
      } catch {
        return text
      }
    } catch {
      return fallback
    }
  }

  return extractErrorMessage(error, fallback)
}
