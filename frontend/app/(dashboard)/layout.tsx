'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/shared/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Spinner } from '@/components/ui/spinner';
import { isAdminRole } from '@/shared/permissions';
import { useEnterprise } from '@/shared/providers/EnterpriseProvider';
import {
  getFallbackDashboardRoute,
  getMatchingNavItemsForPath,
  getPreferredAnalyticsRoute,
  getPreferredServiceRoute,
  isPathAuthorized,
} from '@/shared/dashboard-routing';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const {
    selectedEnterprise,
    enterprises,
    isLoadingEnterprises,
  } = useEnterprise();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const requiredPermission = useMemo(() => {
    const matches = getMatchingNavItemsForPath(pathname);
    return matches[0]?.permission;
  }, [pathname]);
  const isAuthorized = useMemo(() => isPathAuthorized(user, pathname), [pathname, user]);
  const isAdmin = useMemo(() => isAdminRole(user), [user]);
  const preferredServiceRoute = useMemo(() => getPreferredServiceRoute(user), [user]);
  const preferredAnalyticsRoute = useMemo(() => getPreferredAnalyticsRoute(user), [user]);
  const fallbackRoute = useMemo(() => getFallbackDashboardRoute(user), [user]);
  const mustSelectEnterprise =
    isAuthenticated &&
    !isLoading &&
    !isLoadingEnterprises &&
    enterprises.length > 0 &&
    !selectedEnterprise;

  // Vérification d'authentification
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const returnUrl = encodeURIComponent(pathname || '/dashboard');
      router.push(`/login?returnUrl=${returnUrl}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  useEffect(() => {
    if (!isLoading && user?.mustChangePassword) {
      router.replace('/change-password');
    }
  }, [isLoading, router, user?.mustChangePassword]);

  useEffect(() => {
    if (mustSelectEnterprise) {
      router.replace('/select-enterprise');
    }
  }, [mustSelectEnterprise, router]);

  // Fermer la sidebar au changement de route
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isLoading || !user || isAdmin) return;
    if (
      pathname === '/dashboard' &&
      preferredServiceRoute !== '/dashboard' &&
      isPathAuthorized(user, preferredServiceRoute)
    ) {
      router.replace(preferredServiceRoute);
      return;
    }
    if (
      pathname === '/dashboard/analytics' &&
      preferredAnalyticsRoute !== '/dashboard/analytics' &&
      isPathAuthorized(user, preferredAnalyticsRoute)
    ) {
      router.replace(preferredAnalyticsRoute);
      return;
    }
    if (!isAuthorized && fallbackRoute && fallbackRoute !== pathname && isPathAuthorized(user, fallbackRoute)) {
      router.replace(fallbackRoute);
    }
  }, [
    fallbackRoute,
    isAdmin,
    isAuthorized,
    isLoading,
    pathname,
    preferredAnalyticsRoute,
    preferredServiceRoute,
    router,
    user,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (user?.mustChangePassword) return null;
  if (isLoadingEnterprises || mustSelectEnterprise) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Chargement de l&apos;entreprise...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 scroll-smooth">
          {/* 
              CONTENEUR PRINCIPAL : 
              - Réduction du padding (p-4 sur mobile, p-6 sur desktop)
              - max-w-7xl (1280px) pour la structure large
              - w-full pour occuper tout l'espace disponible
          */}
          <div className="w-full max-w-7xl mx-auto p-4 md:p-6">
            <div className="min-h-[calc(100vh-160px)]">
              {!isAuthorized && requiredPermission ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
                  <h2 className="text-lg font-semibold">Accès restreint</h2>
                  <p className="mt-1 text-sm text-amber-800">
                    Vous ne disposez pas des permissions nécessaires pour accéder à cette section. Utilisez le menu latéral pour naviguer vers vos modules autorisés.
                  </p>
                </div>
              ) : (
                children
              )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
              <Footer />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
