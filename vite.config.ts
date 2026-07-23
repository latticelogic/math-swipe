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
    // Emit /version.json so the running client can check whether a newer
    // build is deployed (SettingsSheet's "up to date / tap for vX" line).
    {
      name: 'emit-version-json',
      apply: 'build' as const,
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: pkg.version }) });
      },
    },
    VitePWA({
      registerType: 'prompt',
      workbox: {
        // woff2 in glob → the two self-hosted display fonts in public/fonts/
        // are precached at install (needed for first paint). The ~145KB of
        // KaTeX_* fonts are excluded — they're only used when a latex problem
        // renders, so they cache on first actual use via runtimeCaching below
        // instead of downloading on every install/update on kids' data plans.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // KaTeX fonts + non-English locale catalogs are excluded from the
        // install-time precache: only ONE locale is ever active per session,
        // so downloading eleven unused catalogs on every install/update wastes
        // kids' data plans. Both cache on first actual use via runtimeCaching.
        globIgnores: ['**/KaTeX_*', '**/locale-*.js'],
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
          {
            // The active locale's catalog chunk — cached on first load so
            // non-English users work offline from the second session on.
            // Hashed filenames make immutable caching safe; maxEntries evicts
            // superseded builds.
            urlPattern: /\/assets\/locale-[^/]*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'locale-catalogs',
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
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
        manualChunks(id: string) {
          // Vendor splits (same grouping the old object form produced).
          // Char classes accept both separators — rollup ids use '/' but keep
          // '\\' tolerance for Windows-resolved paths.
          if (id.includes('node_modules')) {
            if (/[\\/](@?firebase)[\\/]/.test(id)) return 'firebase';
            if (/[\\/]framer-motion[\\/]/.test(id)) return 'framer-motion';
            return undefined;
          }
          // Each non-English catalog gets its own `locale-<id>` chunk so it
          // can be lazy-loaded (i18n initI18n) and excluded from the precache.
          const m = /[\\/]src[\\/]i18n[\\/](es|pt-BR|fr|de|it|id|ko|zh-Hans|zh-Hant|ja|hi)\.ts$/.exec(id);
          if (m) return `locale-${m[1]}`;
          return undefined;
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
