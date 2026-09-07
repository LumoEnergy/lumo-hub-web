import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The demo is unlisted: it is served from an unguessable path rather than the
// site root, and the app renders nothing outside it. This is obscurity, not
// security. It is only proportionate because the bundle contains no real data
// and no credential of any kind.
//
// `base` is the single source of truth: Vite exposes it as import.meta.env.BASE_URL,
// which App.tsx hands to the router as its basename.
const DEMO_BASE = '/d/3FgvdyiYBsD9/'

export default defineConfig({
  base: DEMO_BASE,
  plugins: [react(), tailwindcss()],
  server: { port: 8090 },
})
