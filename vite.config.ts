import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxyTarget =
  process.env.VITE_PROXY_TARGET ||
  process.env.VITE_API_BASE_URL ||
  process.env.API_BASE_URL ||
  'https://api.deepexo.eu.org/api'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
