import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    {
      name: 'html-fallback-plugin',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.endsWith('.html') && req.url !== '/index.html' && !req.url.startsWith('/@') && !req.url.startsWith('/src')) {
            req.url = '/index.html';
          }
          next();
        });
      },
    },
    react(), 
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module'
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf}']
      },
      manifest: {
        name: 'TurboFix — AI Maintenance Platform',
        short_name: 'TurboFix',
        description: 'AI-assisted maintenance decision operating system for factory floors',
        theme_color: '#0b1118',
        background_color: '#0b1118',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/maskable-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ],
        shortcuts: [
          {
            name: 'Report Breakdown',
            short_name: 'Report',
            description: 'Log an immediate machine breakdown',
            url: '/report-breakdown.html',
            icons: [{ src: '/pwa-192.png', sizes: '192x192' }]
          },
          {
            name: 'Scan Machine QR',
            short_name: 'Scan QR',
            description: 'Scan machine QR tag to view history',
            url: '/qr-gateway.html',
            icons: [{ src: '/pwa-192.png', sizes: '192x192' }]
          },
          {
            name: 'My Shift Queue',
            short_name: 'Tasks',
            description: 'View technician shift task queue',
            url: '/technician.html',
            icons: [{ src: '/pwa-192.png', sizes: '192x192' }]
          }
        ]
      }
    })
  ],
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
