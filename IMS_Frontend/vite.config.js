import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2018',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }
          if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes('/react/')) {
            return 'react'
          }
          if (id.includes('@reduxjs/toolkit') || id.includes('react-redux')) {
            return 'redux'
          }
          if (id.includes('recharts')) {
            return 'charts'
          }
          return 'vendor'
        },
      },
    },
  },
})
