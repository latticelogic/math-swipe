/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        // woff2 in glob → the two self-hosted display fonts in public/fonts/
        // are precached at install (needed for first paint). The ~145KB of
        // KaTeX_* fonts are excluded — they're only used when a latex problem
        // renders, so they cache on first actual use via runtimeCaching below
        // instead of downloading on every install/update on kids' data plans.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/KaTeX_*'],
        // Avoid stale precache HTML serving the old theme-bootstrap path
        navigateFallbackDenylist: [/^\/theme-bootstrap\.js$/],
        runtimeCaching: [
          {
            urlPattern: /KaTeX_[^/]*\.woff2$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'katex-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // Single-manifest policy: public/manifest.json is the ONE web app
      // manifest (index.html links it directly). It carries the TWA-critical
      // fields (id, orientation, maskable 512 icon) that Bubblewrap reads to
      // package the Google Play app — letting VitePWA emit a second
      // manifest.webmanifest here caused drift between the two.
      manifest: false,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'framer-motion': ['framer-motion'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    // Emulator-backed rules tests run separately (npm run test:rules) since
    // they need Java + the Firestore emulator — keep them out of the default
    // unit-test/CI-build lane so it stays hermetic.
    exclude: ['**/node_modules/**', '**/dist/**', 'firestore-tests/**'],
  },
})
