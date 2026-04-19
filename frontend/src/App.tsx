/**
 * App.tsx — Raiz da aplicação grain.
 *
 * Ordem dos providers (de fora para dentro):
 *   ClerkProvider → QueryClientProvider → BrowserRouter → Routes
 *
 * O ClerkProvider tem de estar na raiz para que o useAuth e
 * o useUser funcionem em qualquer componente da árvore.
 */

import { ClerkProvider } from '@clerk/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { queryClient } from '@/lib/queryClient';

// Páginas
import Landing from '@/pages/Landing';
import Feed from '@/pages/Feed';
import Follow from '@/pages/Follow';
import Sources from '@/pages/Sources';
import Admin from '@/pages/Admin';

// Chave pública do Clerk — vem do .env.local (nunca hardcoded)
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

if (!CLERK_KEY) {
  throw new Error('[grain] VITE_CLERK_PUBLISHABLE_KEY não está definida. Verifica o ficheiro .env.local');
}

export default function App() {
  return (
    <ClerkProvider
      publishableKey={CLERK_KEY}
      afterSignOutUrl={`${import.meta.env.BASE_URL}`}
      /*
       * Aparência minimal do Clerk — modal dark para não
       * quebrar o dark theme do grain.
       * A customização completa é feita no Clerk Dashboard
       * (Passo 1.4 — configuração de redirects e branding).
       */
      appearance={{
        layout: {
          logoImageUrl: 'https://ruifgcosta.github.io/grain/logo.svg',
          logoLinkUrl: `${import.meta.env.BASE_URL}`,
        },
        variables: {
          colorBackground:     '#111111',
          colorInputBackground:'#1a1a1a',
          colorText:           '#f0ece4',
          colorTextSecondary:  '#aaaaaa',
          colorPrimary:        '#c8a96e',
          colorDanger:         '#e05555',
          borderRadius:        '10px',
          fontFamily:          'DM Sans, sans-serif',
          fontFamilyButtons:   'DM Sans, sans-serif',
        },
        elements: {
          card:             { background: '#111111', border: '1px solid #1e1e1e', boxShadow: '0 24px 60px rgba(0,0,0,0.8)' },
          formButtonPrimary:{ backgroundColor: '#c8a96e', color: '#0a0a0a', fontWeight: '600' },
          footerActionLink: { color: '#c8a96e' },
          headerTitle:      { fontFamily: 'Syne, sans-serif', fontWeight: '800', color: '#f0ece4' },
          headerSubtitle:   { color: '#aaaaaa' },
          socialButtonsBlockButton: {
            backgroundColor: '#1a1a1a',
            border: '1px solid #2e2e2e',
            color: '#f0ece4',
          },
          socialButtonsBlockButtonText: { color: '#f0ece4' },
          dividerLine: { backgroundColor: '#2e2e2e' },
          dividerText: { color: '#666' },
          formFieldInput: {
            backgroundColor: '#1a1a1a',
            border: '1px solid #2e2e2e',
            color: '#f0ece4',
          },
          formFieldLabel: { color: '#aaaaaa' },
          logoImage: { width: '44px', height: '44px', borderRadius: '10px' },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            {/* Landing page — apresentação pública (Passo 4.1) */}
            <Route path="/" element={<Navigate to="/feed" replace />} />
            <Route path="/landing" element={<Landing />} />

            {/* App — feed principal */}
            <Route path="/feed" element={<Feed />} />

            {/* App — temas seguidos */}
            <Route path="/follow" element={<Follow />} />

            {/* App — gestão de fontes */}
            <Route path="/sources" element={<Sources />} />

            {/* App — painel admin (role admin no Clerk) */}
            <Route path="/admin" element={<Admin />} />

            {/* Rota não encontrada — redirecção para home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
