import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // When running behind Railway's SSL proxy, tell the browser to connect
    // the HMR WebSocket on port 443 (the external HTTPS port) instead of
    // Vite's internal port 5173. Without this, HMR never connects.
    hmr: process.env.RAILWAY_PUBLIC_DOMAIN
      ? { clientPort: 443 }
      : true,
  },
})
