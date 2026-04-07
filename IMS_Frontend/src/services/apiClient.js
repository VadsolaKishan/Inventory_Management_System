import axios from 'axios'

import { store } from '../store'
import { clearCredentials, syncTokens } from '../store/slices/authSlice'
import { API_BASE_URL, AUTH_STORAGE_KEY } from '../utils/constants'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
})

function readStoredAuth() {
  try {
    const rawValue = localStorage.getItem(AUTH_STORAGE_KEY)
    return rawValue ? JSON.parse(rawValue) : null
  } catch {
    return null
  }
}

function writeStoredAuth(payload) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload))
}

let isRefreshing = false
let queuedRequests = []

function flushQueue(error, accessToken = null) {
  queuedRequests.forEach((request) => {
    if (error) {
      request.reject(error)
      return
    }
    request.resolve(accessToken)
  })
  queuedRequests = []
}

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken || readStoredAuth()?.accessToken
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const statusCode = error.response?.status

    if (!originalRequest || statusCode !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    const requestUrl = String(originalRequest.url || '')
    if (
      requestUrl.includes('auth/login/')
      || requestUrl.includes('auth/register/')
      || requestUrl.includes('auth/token/refresh/')
    ) {
      return Promise.reject(error)
    }

    const refreshToken = store.getState().auth.refreshToken || readStoredAuth()?.refreshToken
    if (!refreshToken) {
      store.dispatch(clearCredentials())
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queuedRequests.push({ resolve, reject })
      }).then((newAccessToken) => {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const refreshResponse = await axios.post(`${API_BASE_URL}auth/token/refresh/`, {
        refresh: refreshToken,
      })

      const newAccessToken = refreshResponse.data.access
      const newRefreshToken = refreshResponse.data.refresh || refreshToken

      const currentAuth = readStoredAuth() || {}
      writeStoredAuth({
        ...currentAuth,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        isAuthenticated: true,
      })

      store.dispatch(
        syncTokens({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        }),
      )

      flushQueue(null, newAccessToken)
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      flushQueue(refreshError)
      store.dispatch(clearCredentials())
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default api