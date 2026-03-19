'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/shared/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Spinner } from '@/components/ui/spinner';
import { sidebarItems, adminNavigation } from '@/components/layout/sidebarData';
import { hasPermission, isAdminRole } from '@/shared/permissions';
import {
  getFallbackDashboardRoute,
  getPreferredAnalyticsRoute,
  getPreferredServiceRoute,
} from '@/shared/dashboard-routing';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const requiredPermission = useMemo(() => {
    if (!pathname) return undefined;
    const allItems = [...sidebarItems, ...adminNavigation].filter(item => item.href && item.permission);
    const matches = allItems.filter(item =>
      pathname === item.href || pathname.startsWith(`${item.href}/`)
    );
    matches.sort((a, b) => (b.href?.length || 0) - (a.href?.length || 0));
    return matches[0]?.permission;
  }, [pathname]);
  const isAuthorized = useMemo(() => {
    if (!requiredPermission) return true;
    return hasPermission(user, requiredPermission);
  }, [requiredPermission, user]);
  const isAdmin = useMemo(() => isAdminRole(user), [user]);
  const preferredServiceRoute = useMemo(() => getPreferredServiceRoute(user), [user]);
  const preferredAnalyticsRoute = useMemo(() => getPreferredAnalyticsRoute(user), [user]);
  const fallbackRoute = useMemo(() => getFallbackDashboardRoute(user), [user]);

  // Vérification d'authentification
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const returnUrl = encodeURIComponent(pathname || '/dashboard');
      router.push(`/login?returnUrl=${returnUrl}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  // Fermer la sidebar au changement de route
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isLoading || !user || isAdmin) return;
    if (pathname === '/dashboard' && preferredServiceRoute !== '/dashboard') {
      router.replace(preferredServiceRoute);
    }
    if (pathname === '/dashboard/analytics' && preferredAnalyticsRoute !== '/dashboard/analytics') {
      router.replace(preferredAnalyticsRoute);
    }
  }, [isAdmin, isLoading, pathname, preferredAnalyticsRoute, preferredServiceRoute, router, user]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    if (!requiredPermission) return;
    if (!isAuthorized) {
      const target = fallbackRoute === pathname ? '/dashboard' : fallbackRoute;
      router.replace(target);
    }
  }, [fallbackRoute, isLoading, isAuthorized, pathname, requiredPermission, router, user]);

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
  if (!isAuthorized && requiredPermission) return null;

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
              {children}
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
