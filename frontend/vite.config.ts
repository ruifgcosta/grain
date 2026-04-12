/**
 * Configuração do Vite para o frontend grain.
 * Usa o plugin oficial do Tailwind v4 (substitui postcss).
 * O alias @/ mapeia para src/ para imports limpos.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: false, // usamos o manifest.json estático em /public
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/grain-backend\..*\.workers\.dev\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
          {
            urlPattern: /^https:\/\/www\.google\.com\/s2\/favicons/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'favicons-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 * 7 },
            },
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      // Permite imports como: import { X } from '@/components/...'
      '@': resolve(__dirname, './src'),
    },
  },

  // Em produção: deploy para GitHub Pages no sub-path /grain
  // Em desenvolvimento: '/' é o correcto
  base: process.env.NODE_ENV === 'production' ? '/grain/' : '/',

  server: {
    port: 5173,
    // Proxy para o backend local (evita CORS em desenvolvimento)
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
