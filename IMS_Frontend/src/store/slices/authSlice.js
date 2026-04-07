import { createSlice } from '@reduxjs/toolkit'

import { AUTH_STORAGE_KEY } from '../../utils/constants'

function normalizeRole(role) {
  if (role === 'inventory_manager') {
    return 'manager'
  }
  if (role === 'warehouse_staff') {
    return 'staff'
  }
  return role || null
}

function normalizeUser(user) {
  if (!user) {
    return null
  }
  return {
    ...user,
    role: normalizeRole(user.role),
  }
}

function readStoredAuth() {
  try {
    const rawValue = sessionStorage.getItem(AUTH_STORAGE_KEY)
    if (!rawValue) {
      return null
    }
    const parsed = JSON.parse(rawValue)
    return {
      ...parsed,
      user: normalizeUser(parsed.user),
    }
  } catch {
    return null
  }
}

function persistAuth(state) {
  const payload = {
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    user: state.user,
    isAuthenticated: state.isAuthenticated,
  }
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload))
}

function clearStoredAuth() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
}

const storedAuth = readStoredAuth()

const initialState = {
  accessToken: storedAuth?.accessToken || '',
  refreshToken: storedAuth?.refreshToken || '',
  user: storedAuth?.user || null,
  isAuthenticated: Boolean(storedAuth?.accessToken && storedAuth?.refreshToken),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.accessToken = action.payload.access_token || action.payload.access || ''
      state.refreshToken = action.payload.refresh_token || action.payload.refresh || ''
      state.user = normalizeUser(action.payload.user)
      state.isAuthenticated = Boolean(state.accessToken && state.refreshToken)
      persistAuth(state)
    },
    syncTokens: (state, action) => {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      state.isAuthenticated = Boolean(state.accessToken && state.refreshToken)
      persistAuth(state)
    },
    setUser: (state, action) => {
      state.user = normalizeUser(action.payload)
      persistAuth(state)
    },
    clearCredentials: (state) => {
      state.accessToken = ''
      state.refreshToken = ''
      state.user = null
      state.isAuthenticated = false
      clearStoredAuth()
    },
  },
})

export const { setCredentials, syncTokens, setUser, clearCredentials } = authSlice.actions

export const selectAuth = (state) => state.auth
export const selectCurrentUser = (state) => state.auth.user
export const selectCurrentUserRole = (state) => normalizeRole(state.auth.user?.role)
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated

export default authSlice.reducer