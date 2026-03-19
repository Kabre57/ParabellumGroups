'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Moon, Sun } from 'lucide-react';
import { procurementService } from '@/services/procurement';
import { inventoryReceptionsService } from '@/shared/api/inventory/receptions.service';
import { useTheme } from '@/shared/providers/ThemeProvider';
import { UserMenu } from './UserMenu';
import { NotificationDropdown } from './NotificationDropdown';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [dynamicBreadcrumbLabels, setDynamicBreadcrumbLabels] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const isUuidLike = (value: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

    const resolveDynamicLabel = async () => {
      if (!pathname) {
        if (!cancelled) {
          setDynamicBreadcrumbLabels({});
        }
        return;
      }

      const nextLabels: Record<string, string> = {};

      const quoteMatch = pathname.match(/^\/dashboard\/achats\/devis\/([^/]+)$/);
      if (quoteMatch && isUuidLike(quoteMatch[1])) {
        try {
          const response = await procurementService.getRequest(quoteMatch[1]);
          nextLabels[pathname] =
            response.data?.number ||
            response.data?.numeroDevisAchat ||
            response.data?.numeroDemande ||
            quoteMatch[1];
        } catch (_error) {
          nextLabels[pathname] = quoteMatch[1];
        }
      }

      const orderMatch = pathname.match(/^\/dashboard\/achats\/commandes\/([^/]+)$/);
      if (orderMatch && isUuidLike(orderMatch[1])) {
        try {
          const response = await procurementService.getOrder(orderMatch[1]);
          nextLabels[pathname] = response.data?.number || response.data?.numeroBon || orderMatch[1];
        } catch (_error) {
          nextLabels[pathname] = orderMatch[1];
        }
      }

      const receptionMatch = pathname.match(/^\/dashboard\/achats\/receptions\/([^/]+)$/);
      if (receptionMatch && isUuidLike(receptionMatch[1])) {
        try {
          const response = await inventoryReceptionsService.get(receptionMatch[1]);
          nextLabels[pathname] = response.data?.numero || receptionMatch[1];
        } catch (_error) {
          nextLabels[pathname] = receptionMatch[1];
        }
      }

      if (!cancelled) {
        setDynamicBreadcrumbLabels(nextLabels);
      }
    };

    resolveDynamicLabel();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Générer les breadcrumbs depuis le pathname
  const generateBreadcrumbs = () => {
    if (!pathname) return [];

    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [];

    // Toujours commencer par Dashboard
    if (segments.length > 0 && segments[0] === 'dashboard') {
      breadcrumbs.push({
        label: 'Dashboard',
        href: '/dashboard',
      });

      // Ajouter les segments suivants
      for (let i = 1; i < segments.length; i++) {
        const segment = segments[i];
        const href = '/' + segments.slice(0, i + 1).join('/');

        const defaultLabel = segment
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        const label = dynamicBreadcrumbLabels[href] || defaultLabel;

        breadcrumbs.push({ label, href });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          {/* Menu button (mobile) */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}

          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <nav className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.href}>
                  {index > 0 && (
                    <span className="text-gray-400 dark:text-gray-600">/</span>
                  )}
                  <span
                    className={
                      index === breadcrumbs.length - 1
                        ? 'text-gray-900 dark:text-gray-100 font-medium'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }
                  >
                    {crumb.label}
                  </span>
                </React.Fragment>
              ))}
            </nav>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-2">
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Changer le thème"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          )}

          {/* Notifications */}
          <NotificationDropdown />

          {/* User menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
};
export default Header;
