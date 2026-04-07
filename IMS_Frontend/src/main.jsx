import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import './index.css'
import App from './App.jsx'
import { store } from './store'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '14px',
              border: '1px solid #d6dfec',
              background: '#ffffff',
              color: '#14213d',
              boxShadow: '0 20px 50px rgba(23, 42, 73, 0.08)',
            },
          }}
        />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
