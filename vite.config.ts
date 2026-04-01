import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

// Exposes POST /__hmr?file=<absolute-path> so the genuyn-live server
// can trigger HMR immediately after writing a file, bypassing Chokidar polling.
function hmrTriggerPlugin(): Plugin {
  return {
    name: 'hmr-trigger',
    configureServer(server) {
      server.middlewares.use('/__hmr', (req, res) => {
        const url = new URL(req.url!, 'http://localhost')
        const file = url.searchParams.get('file')
        if (file) server.watcher.emit('change', file)
        res.writeHead(200).end('ok')
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), hmrTriggerPlugin()],
  server: {
    allowedHosts: 'all',
    hmr: process.env.RAILWAY_PUBLIC_DOMAIN
      ? { clientPort: 443 }
      : true,
  },
  // Skip WS token validation — token is regenerated on every Railway deploy,
  // causing browsers with cached /@vite/client to fail authentication.
  legacy: { skipWebSocketTokenCheck: true },
})
