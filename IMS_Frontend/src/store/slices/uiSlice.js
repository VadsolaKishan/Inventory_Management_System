import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  sidebarOpen: true,
  alertCount: 0,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setAlertCount: (state, action) => {
      state.alertCount = action.payload
    },
  },
})

export const { setSidebarOpen, toggleSidebar, setAlertCount } = uiSlice.actions
export const selectSidebarOpen = (state) => state.ui.sidebarOpen
export const selectAlertCount = (state) => state.ui.alertCount

export default uiSlice.reducer