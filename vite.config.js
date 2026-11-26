import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served under /eGate-admin/ so it can sit next to the VMS app (/eGate/) on the same domain.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: '/eGate-admin/',
  // Fixed port (VMS is 5174, OEMup's frontend 5173); strictPort: fail instead of moving silently
  server: { port: 5175, strictPort: true },
  // Production builds drop console.log / debug calls (console.warn / error stay)
  esbuild: command === 'build' ? { pure: ['console.log', 'console.debug', 'console.info'], drop: ['debugger'] } : {},
}))
