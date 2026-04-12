/**
 * Configuração do Vite para o frontend grain.
 * Usa o plugin oficial do Tailwind v4 (substitui postcss).
 * O alias @/ mapeia para src/ para imports limpos.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),  // Tailwind v4 via plugin Vite (sem postcss.config)
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
