import { sidebarItems, adminNavigation } from '@/components/layout/sidebarData';
import { User } from '@/shared/api/shared/types';
import { hasAnyPermission, hasPermission, isAdminRole } from '@/shared/permissions';

export const canAccessItem = (user: User | null | undefined, permission?: string | string[]) => {
  if (!permission) return true;
  if (permission === 'admin') return isAdminRole(user);
  return Array.isArray(permission) ? hasAnyPermission(user, permission) : hasPermission(user, permission);
};

export const getMatchingNavItemsForPath = (pathname: string | null | undefined) => {
  if (!pathname) return [];
  const allItems = [...sidebarItems, ...adminNavigation].filter((item) => Boolean(item.href));
  const matches = allItems.filter((item) => {
    if (!item.href) return false;
    if (item.href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  });

  if (matches.length === 0) return [];
  const maxLength = Math.max(...matches.map((item) => item.href?.length || 0));
  return matches.filter((item) => (item.href?.length || 0) === maxLength);
};

export const isPathAuthorized = (user: User | null | undefined, pathname: string | null | undefined): boolean => {
  if (!pathname) return true;
  if (isAdminRole(user)) return true;

  const matchingItems = getMatchingNavItemsForPath(pathname);
  if (matchingItems.length === 0) return true;

  return matchingItems.some((item) => canAccessItem(user, item.permission));
};

export const getFallbackDashboardRoute = (user: User | null | undefined): string => {
  const isAdmin = isAdminRole(user);
  if (isAdmin) return '/dashboard';

  const permittedItems = [...sidebarItems, ...adminNavigation].filter((item) => {
    if (!item.href) return false;
    if (item.href === '/dashboard') return false;
    if (!item.permission) return false;
    return canAccessItem(user, item.permission);
  });

  const sortedItems = permittedItems.sort((a, b) => {
    const scoreA = a.isServiceDashboard ? 0 : 1;
    const scoreB = b.isServiceDashboard ? 0 : 1;
    if (scoreA !== scoreB) return scoreA - scoreB;
    return (a.href?.length || 0) - (b.href?.length || 0);
  });

  if (sortedItems[0]?.href) {
    return sortedItems[0].href;
  }

  if (canAccessItem(user, 'dashboard.read')) {
    return '/dashboard';
  }

  return '/dashboard/settings';
};

export const getPreferredServiceRoute = (user: User | null | undefined): string => {
  if (isAdminRole(user)) return '/dashboard';

  const visibleServiceItems = sidebarItems.filter((item) => {
    if (!item.href || item.categoryId === 'dashboard') return false;
    if (!item.isServiceDashboard) return false;
    return canAccessItem(user, item.permission);
  });

  if (visibleServiceItems[0]?.href) {
    return visibleServiceItems[0].href;
  }

  if (canAccessItem(user, 'dashboard.read')) {
    return '/dashboard';
  }

  return getFallbackDashboardRoute(user);
};

export const getPreferredAnalyticsRoute = (user: User | null | undefined): string => {
  if (isAdminRole(user)) return '/dashboard/analytics';

  const analyticsItem = sidebarItems.find((item) =>
    item.isServiceDashboard &&
    item.href?.includes('/analytics') &&
    item.categoryId !== 'dashboard' &&
    canAccessItem(user, item.permission)
  );

  return analyticsItem?.href || getPreferredServiceRoute(user);
};
