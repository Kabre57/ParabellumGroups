'use client';

import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Configuration du QueryClient
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Nombre de tentatives en cas d'échec, sauf pour les erreurs d'auth
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
          return false;
        }
        return failureCount < 2;
      },
      // Désactiver le refetch automatique au focus de la fenêtre
      refetchOnWindowFocus: false,
      // Temps pendant lequel les données sont considérées comme fraîches (5 minutes)
      staleTime: 5 * 60 * 1000,
      // Temps de cache avant suppression (10 minutes)
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      // Pas de retry automatique pour les mutations
      retry: 0,
    },
  },
});

/**
 * Props du QueryProvider
 */
interface QueryProviderProps {
  children: ReactNode;
}

/**
 * Provider React Query
 * Configure et fournit le client React Query à l'application
 */
export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export default QueryProvider;
