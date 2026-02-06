'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/shared/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Spinner } from '@/components/ui/spinner';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Vérification d'authentification
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Rediriger vers la page de connexion avec l'URL de retour
      const returnUrl = encodeURIComponent(pathname || '/dashboard');
      router.push(`/login?returnUrl=${returnUrl}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  // Fermer la sidebar au changement de route
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Afficher un loader pendant la vérification
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  // Ne rien afficher si non authentifié (redirection en cours)
  if (!isAuthenticated) {
    return null;
  }

  // Layout principal avec structure flex
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar fixe à gauche */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Conteneur principal (Header + Content + Footer) */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Header sticky en haut */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Contenu principal scrollable */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            <div className="max-w-7xl mx-auto">{children}</div>
          </div>
        </main>

        {/* Footer en bas */}
        <Footer />
      </div>
    </div>
  );
}
