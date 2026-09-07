import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
// @ts-expect-error local express middleware, no declaration file
import { apiMiddleware } from './server/app.mjs'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'cadde54-api',
      configureServer(server) {
        server.middlewares.use(apiMiddleware())
      },
      configurePreviewServer(server) {
        server.middlewares.use(apiMiddleware())
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      pwaAssets: { disabled: true },
      includeAssets: ['pwa-192.png', 'pwa-512.png'],
      devOptions: { enabled: true, type: 'module' },
      scope: '/app/',
      manifest: {
        name: 'Cadde54 Social',
        short_name: 'Cadde54 Social',
        description: 'Cadde54 Social — Bağdat Caddesi sosyal ağı',
        theme_color: '#07070B',
        background_color: '#07070B',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/app/login',
        scope: '/app/',
        id: '/app',
        lang: 'tr',
        prefer_related_applications: false,
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'unsplash-images',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 14 },
            },
          },
          {
            urlPattern: /^https:\/\/api\.dicebear\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'avatars',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/commondatastorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'demo-videos',
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        importScripts: ['/push-handler.js'],
      },
    }),
  ],
})
