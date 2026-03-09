'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/shared/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Spinner } from '@/components/ui/spinner';
import { sidebarItems, adminNavigation } from '@/components/layout/sidebarData';
import { hasPermission } from '@/shared/permissions';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const requiredPermission = React.useMemo(() => {
    if (!pathname) return undefined;
    const allItems = [...sidebarItems, ...adminNavigation].filter(item => item.href && item.permission);
    const matches = allItems.filter(item =>
      pathname === item.href || pathname.startsWith(`${item.href}/`)
    );
    matches.sort((a, b) => (b.href?.length || 0) - (a.href?.length || 0));
    return matches[0]?.permission;
  }, [pathname]);
  const isAuthorized = React.useMemo(() => {
    if (!requiredPermission) return true;
    return hasPermission(user, requiredPermission);
  }, [requiredPermission, user]);

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
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      const requiredPermission = detail.permission;
      const base = '/access-denied';
      const target = requiredPermission
        ? `${base}?permission=${encodeURIComponent(requiredPermission)}`
        : base;

      if (pathname !== base) {
        router.push(target);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:forbidden', handler as EventListener);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:forbidden', handler as EventListener);
      }
    };
  }, [router, pathname]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    if (!requiredPermission) return;
    if (pathname?.startsWith('/access-denied')) return;
    if (!isAuthorized) {
      const target = `/access-denied?permission=${encodeURIComponent(requiredPermission)}`;
      router.replace(target);
    }
  }, [isLoading, user, requiredPermission, isAuthorized, router, pathname]);

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
