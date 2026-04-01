import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Vite 6 blocks requests with foreign Host headers by default.
    // Behind Railway's proxy the Host is the public domain, not localhost —
    // allow all hosts so the HMR WebSocket can connect through the proxy.
    allowedHosts: 'all',
    hmr: process.env.RAILWAY_PUBLIC_DOMAIN
      ? { clientPort: 443 }
      : true,
  },
})
