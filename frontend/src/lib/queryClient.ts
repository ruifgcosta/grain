/**
 * Configuração do React Query client.
 *
 * Opções escolhidas para o grain:
 * - staleTime 5 min: o feed não precisa de refetch constante
 * - retry 1: em Workers, 2 falhas seguidas é problema real
 * - refetchOnWindowFocus false: evita refetch desnecessário ao trocar de tab
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados considerados frescos durante 5 minutos
      staleTime: 5 * 60 * 1000,
      // Cache mantido 10 minutos após ficar inactivo
      gcTime: 10 * 60 * 1000,
      // Apenas 1 retry em caso de erro (Workers são rápidos)
      retry: 1,
      // Não refetch ao focar a janela — o utilizador controla
      refetchOnWindowFocus: false,
      // Refetch ao reconectar (volta de offline)
      refetchOnReconnect: true,
    },
    mutations: {
      // Sem retry em mutações — operações destrutivas não devem repetir
      retry: 0,
    },
  },
});
