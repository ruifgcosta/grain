/**
 * App.tsx — Raiz da aplicação grain.
 *
 * Configura os providers globais e define o router.
 * Estrutura de providers (de fora para dentro):
 *   QueryClientProvider → BrowserRouter → Routes
 *
 * O Clerk será adicionado no Passo 1.4.
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { queryClient } from '@/lib/queryClient';

// Páginas
import Landing from '@/pages/Landing';
import Feed from '@/pages/Feed';
import Follow from '@/pages/Follow';
import Sources from '@/pages/Sources';
import Admin from '@/pages/Admin';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Landing page — apresentação pública */}
          <Route path="/" element={<Landing />} />

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
  );
}
