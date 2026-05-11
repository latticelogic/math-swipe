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
        // woff2 in glob → fonts in public/fonts/ are precached at install time.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Avoid stale precache HTML serving the old theme-bootstrap path
        navigateFallbackDenylist: [/^\/theme-bootstrap\.js$/],
        // No runtimeCaching needed — fonts are now self-hosted and covered
        // by globPatterns above. Previously we cached Google Fonts CDN here.
      },
      manifest: {
        name: 'Math Swipe',
        short_name: 'Math Swipe',
        description: 'Fast-paced mental math game',
        theme_color: '#1a1a24',
        background_color: '#1a1a24',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
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
  },
})
