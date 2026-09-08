import { mkdirSync, writeFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// Explicit extension: Vite's forthcoming native config loader cannot resolve an
// extensionless relative import here, even though the rest of the codebase uses them.
import { DEMO_BASE } from './src/demoBase.ts'

// TypeScript rather than the .js that lumo-app-web uses, so the base path can be
// imported from src/demoBase.ts instead of being duplicated here. It is the value
// the router mounts on; a second copy of it that drifts renders a blank page.
//
// `base` alone is NOT enough. It only rewrites the URLs inside index.html; the build
// still writes assets to dist/assets, which a static host serves at /assets. The HTML
// then asks for /d/<base>/assets/… , the host has no such file, the SPA catch-all
// returns index.html with a text/html content type, the module fails to parse, and
// every screen is blank. So outDir is nested to match, and scripts/verify-build.mjs
// asserts every URL in the built HTML resolves to a real file before any deploy.

// Site-root files. They cannot live in public/, because publicDir is copied into
// outDir, which is now the nested base path — and robots.txt has to be at the root to
// mean anything.
const siteRootFiles = () => ({
  name: 'hub-site-root-files',
  apply: 'build' as const,
  closeBundle() {
    mkdirSync('dist', { recursive: true })
    writeFileSync('dist/robots.txt', 'User-agent: *\nDisallow: /\n')
  },
})

export default defineConfig({
  base: DEMO_BASE,
  build: {
    outDir: `dist${DEMO_BASE}`.replace(/\/$/, ''),
  },
  plugins: [react(), tailwindcss(), siteRootFiles()],
  server: { port: 8090 },
})
