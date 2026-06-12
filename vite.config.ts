import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/nvidia': {
            target: 'https://integrate.api.nvidia.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/nvidia/, '/v1'),
          },
        },
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          // Disable SW in dev to prevent it intercepting Firebase/Firestore
          // streaming connections (which breaks real-time listeners).
          // Use `npm run preview` with the `dist/` folder to test offline mode.
          devOptions: {
            enabled: false,
          },
          // All built assets are pre-cached; SW will also cache navigation requests
          includeAssets: ['manifest.json'],
          manifest: {
            name: 'Zion Notes',
            short_name: 'Zion Notes',
            description: 'AI-powered note taker — works offline',
            start_url: '/',
            display: 'standalone',
            orientation: 'any',
            background_color: '#0f172a',
            theme_color: '#3b82f6',
            icons: [
              {
                src: '/app-icon.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/app-icon.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              },
            ],
          },
          workbox: {
            // Pre-cache all build output
            globPatterns: ['**/*.{js,css,html,svg,woff2,woff,ttf,ico}'],
            // Don't cache sourcemaps, huge pdf.js worker, or the oversized app icon
            globIgnores: ['**/*.map', '**/pdf.worker*', 'app-icon.png'],
            // Raise the per-file limit to 5 MB (main bundle is ~4 MB gzipped)
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

            // Runtime caching rules
            runtimeCaching: [
              // ---------------------------------------------------------------
              // Google Fonts — stale-while-revalidate so fonts always load
              // ---------------------------------------------------------------
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'google-fonts-stylesheets',
                  expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 },
                },
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-webfonts',
                  expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                },
              },
              // ---------------------------------------------------------------
              // CDN scripts (tailwind, aistudio react, etc.) — cache-first
              // ---------------------------------------------------------------
              {
                urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'cdn-tailwind',
                  expiration: { maxAgeSeconds: 60 * 60 * 24 * 90 },
                },
              },
              {
                urlPattern: /^https:\/\/aistudiocdn\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'cdn-aistudio',
                  expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 },
                },
              },

              // ---------------------------------------------------------------
              // All other same-origin requests — network-first
              // ---------------------------------------------------------------
              {
                urlPattern: ({ url }: { url: URL }) =>
                  url.origin === 'http://localhost:3000' ||
                  url.origin === self.location.origin,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'app-shell',
                  networkTimeoutSeconds: 3,
                  expiration: { maxAgeSeconds: 60 * 60 * 24 * 7 },
                },
              },
            ],
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
