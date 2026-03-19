import { sidebarItems, adminNavigation } from '@/components/layout/sidebarData';
import { User } from '@/shared/api/shared/types';
import { hasPermission, isAdminRole } from '@/shared/permissions';

export const getPreferredServiceRoute = (user: User | null | undefined): string => {
  if (isAdminRole(user)) return '/dashboard';

  const visibleServiceItems = sidebarItems.filter((item) => {
    if (!item.href || item.categoryId === 'dashboard') return false;
    if (!item.isServiceDashboard) return false;
    return hasPermission(user, item.permission);
  });

  return visibleServiceItems[0]?.href || '/dashboard';
};

export const getPreferredAnalyticsRoute = (user: User | null | undefined): string => {
  if (isAdminRole(user)) return '/dashboard/analytics';

  const analyticsItem = sidebarItems.find((item) =>
    item.isServiceDashboard &&
    item.href?.includes('/analytics') &&
    item.categoryId !== 'dashboard' &&
    hasPermission(user, item.permission)
  );

  return analyticsItem?.href || getPreferredServiceRoute(user);
};

export const getFallbackDashboardRoute = (user: User | null | undefined): string => {
  const isAdmin = isAdminRole(user);
  const visibleItems = [...sidebarItems, ...adminNavigation].filter((item) => {
    if (!item.href) return false;
    if (!isAdmin && item.categoryId === 'dashboard') return false;
    if (item.permission === 'admin') return isAdmin;
    return hasPermission(user, item.permission);
  });

  const sortedItems = visibleItems.sort((a, b) => {
    const scoreA = a.isServiceDashboard ? 0 : 1;
    const scoreB = b.isServiceDashboard ? 0 : 1;
    if (scoreA !== scoreB) return scoreA - scoreB;
    return (a.href?.length || 0) - (b.href?.length || 0);
  });

  return sortedItems[0]?.href || '/dashboard';
};
