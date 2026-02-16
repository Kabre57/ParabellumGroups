'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  Search,
  X,
  ChevronLeft,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  sidebarCategories,
  sidebarItems,
  adminNavigation,
  quickAccessItems,
  employeeProjectShortcuts
} from './sidebarData';

interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  permission?: string;
  badge?: number;
}

interface CategoryItem extends NavigationItem {
  children?: NavigationItem[];
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const professionalCategories: CategoryItem[] = useMemo(() => {
    return sidebarCategories.map(category => ({
      ...category,
      children: sidebarItems.filter(item => item.categoryId === category.id)
    }));
  }, []);

  const permissionSet = useMemo(() => {
    const raw: string[] = [];
    if (Array.isArray(user?.permissionsList)) {
      raw.push(...user.permissionsList);
    }
    if (Array.isArray(user?.permissions)) {
      raw.push(...user.permissions);
    } else if (typeof user?.permissions === 'string') {
      try {
        const parsed = JSON.parse(user.permissions);
        if (Array.isArray(parsed)) {
          raw.push(...parsed);
        }
      } catch {
        // Ignore invalid string payloads
      }
    }
    return new Set(raw.map(p => p.toLowerCase()));
  }, [user]);

  const getPermissionAliases = useCallback((permission: string) => {
    const normalized = permission.toLowerCase();
    const aliases = new Set<string>([normalized]);

    if (normalized.endsWith('.read')) {
      aliases.add(normalized.replace(/\.read$/, '.view'));
      aliases.add(normalized.replace(/\.read$/, '.view_all'));
      aliases.add(normalized.replace(/\.read$/, '.view_assigned'));
      aliases.add(normalized.replace(/\.read$/, '.read_all'));
      aliases.add(normalized.replace(/\.read$/, '.read_assigned'));
    }

    if (normalized.endsWith('.view')) {
      aliases.add(normalized.replace(/\.view$/, '.read'));
    }

    if (normalized.endsWith('.read_all')) {
      aliases.add(normalized.replace(/\.read_all$/, '.read'));
    }

    if (normalized.endsWith('.read_assigned')) {
      aliases.add(normalized.replace(/\.read_assigned$/, '.read'));
    }

    if (normalized === 'messages.read') {
      aliases.add('messages.view');
    }

    if (normalized === 'inventory.read') {
      aliases.add('inventory.view');
      aliases.add('inventory.view_all');
      aliases.add('inventory.view_warehouse');
    }

    return Array.from(aliases);
  }, []);

  // CORRECTION 1: Vérification robuste du rôle avec typecasting approprié
  const isEmployee = useMemo(() => {
    if (!user?.role) return false;

    const role = user.role;

    if (typeof role === 'string') {
      return role.toUpperCase() === 'EMPLOYEE';
    }

    if (role && typeof role === 'object') {
      const roleObj = role as any;
      const roleValue = roleObj.code || roleObj.name || roleObj.value || roleObj.role;

      if (roleValue && typeof roleValue === 'string') {
        return roleValue.toUpperCase() === 'EMPLOYEE';
      }

      if (roleObj.toString && typeof roleObj.toString === 'function') {
        const strValue = roleObj.toString().toUpperCase();
        return strValue.includes('EMPLOYEE');
      }
    }

    return false;
  }, [user]);

  const isAdmin = useMemo(() => {
    if (!user?.role) return false;

    const role = user.role;

    if (typeof role === 'string') {
      const upperRole = role.toUpperCase();
      return upperRole === 'ADMIN' || upperRole === 'ADMINISTRATOR' || upperRole === 'ADMINISTRATEUR';
    }

    if (role && typeof role === 'object') {
      const roleObj = role as any;

      if (roleObj.code) {
        const upperCode = roleObj.code.toUpperCase();
        return upperCode === 'ADMIN' || upperCode === 'ADMINISTRATOR';
      }

      if (roleObj.name) {
        const upperName = roleObj.name.toUpperCase();
        return upperName === 'ADMIN' || upperName === 'ADMINISTRATOR' || upperName === 'ADMINISTRATEUR';
      }

      const roleValue = roleObj.value || roleObj.role;
      if (roleValue && typeof roleValue === 'string') {
        const upperValue = roleValue.toUpperCase();
        return upperValue === 'ADMIN' || upperValue === 'ADMINISTRATOR' || upperValue === 'ADMINISTRATEUR';
      }

      if (roleObj.toString && typeof roleObj.toString === 'function') {
        const strValue = roleObj.toString().toUpperCase();
        return strValue.includes('ADMIN');
      }
    }

    return false;
  }, [user]);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sidebarCategories.forEach(category => {
      initial[category.name] = category.id === 'dashboard';
    });
    return initial;
  });

  // Fonction pour vérifier l'accès
  const hasAccess = useCallback((item: NavigationItem) => {
    if (!item.permission) return true;
    if (isAdmin) return true;
    const perm = item.permission.toLowerCase();
    if (perm === 'admin') return false;
    const aliases = getPermissionAliases(perm);
    return aliases.some((alias) => permissionSet.has(alias));
  }, [isAdmin, permissionSet, getPermissionAliases]);

  const toggleCategory = useCallback((categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  }, []);

  const toggleFavorite = useCallback((href: string) => {
    setFavorites(prev =>
      prev.includes(href)
        ? prev.filter(f => f !== href)
        : [...prev, href]
    );
  }, []);

  const filterBySearch = useCallback((items: NavigationItem[]) => {
    if (!searchQuery) return items;
    return items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const visibleQuickAccess = useMemo(() => {
    if (isEmployee) {
      const base = quickAccessItems.filter(hasAccess);
      const projShortcuts = employeeProjectShortcuts.filter(hasAccess);
      const allChildren = professionalCategories.flatMap(cat =>
        (cat.children || []).map(child => child)
      ).filter(hasAccess);

      const seen = new Set<string>();
      const merged = [...projShortcuts, ...base, ...allChildren];
      return merged.filter(item => {
        if (!item.href || seen.has(item.href)) return false;
        seen.add(item.href);
        return true;
      });
    }
    return quickAccessItems.filter(hasAccess);
  }, [isEmployee, hasAccess, professionalCategories]);

  const visibleCategories = useMemo(() => {
    return professionalCategories.filter(category => {
      if (isAdmin) return true;
      if (hasAccess(category)) return true;
      if (category.children) {
        return category.children.some(child => hasAccess(child));
      }
      return false;
    });
  }, [isAdmin, hasAccess, professionalCategories]);

  const getUserRoleDisplay = () => {
    if (!user?.role) return 'Utilisateur';

    const role = user.role;

    if (typeof role === 'string') {
      const roles: Record<string, string> = {
        'ADMIN': 'Administrateur',
        'ADMINISTRATOR': 'Administrateur',
        'GENERAL_DIRECTOR': 'Directeur Général',
        'SERVICE_MANAGER': 'Responsable Service',
        'EMPLOYEE': 'Collaborateur',
        'ACCOUNTANT': 'Comptable',
        'PURCHASING_MANAGER': 'Responsable Achats'
      };
      return roles[role.toUpperCase()] || role;
    }

    if (role && typeof role === 'object') {
      const roleObj = role as any;
      const roleName = roleObj.name || roleObj.code || roleObj.value || roleObj.role || roleObj.label;

      if (roleName && typeof roleName === 'string') {
        const roles: Record<string, string> = {
          'ADMIN': 'Administrateur',
          'ADMINISTRATOR': 'Administrateur',
          'GENERAL_DIRECTOR': 'Directeur Général',
          'SERVICE_MANAGER': 'Responsable Service',
          'EMPLOYEE': 'Collaborateur',
          'ACCOUNTANT': 'Comptable',
          'PURCHASING_MANAGER': 'Responsable Achats'
        };
        return roles[roleName.toUpperCase()] || roleName;
      }

      return 'Utilisateur';
    }

    return 'Utilisateur';
  };

  const getUserName = () => {
    if (!user) return 'Utilisateur';

    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }

    if (user.email && typeof user.email === 'string') {
      return user.email.split('@')[0];
    }

    return 'Utilisateur';
  };

  const handleLogout = () => {
    if (logout) logout();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-all duration-300 ease-in-out flex flex-col",
          isCollapsed ? 'w-20' : 'w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        )}
      >
        <div className="flex-shrink-0 flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          {!isCollapsed ? (
            <>
              <div className="flex items-center space-x-3">
                <Image
                  src="/parabellum.jpg"
                  alt="Parabellum"
                  width={40}
                  height={40}
                  className="rounded-lg object-cover"
                />
                <div className="flex flex-col">
                  <h1 className="text-gray-900 dark:text-gray-100 text-base font-bold leading-tight">Parabellum</h1>
                  <span className="text-gray-500 dark:text-gray-400 text-xs">ERP</span>
                </div>
              </div>
              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:block p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Réduire"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsCollapsed(false)}
              className="hidden lg:block mx-auto p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Étendre"
            >
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        {!isCollapsed && (
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className={cn("px-3 space-y-1 py-3", isCollapsed && "px-2")}>

            {visibleCategories.map((category) => {
              const filteredChildren = category.children?.filter(hasAccess) || [];

              if (filteredChildren.length === 0 && !isAdmin) {
                return null;
              }

              const isExpanded = expandedCategories[category.name];

              if (isCollapsed) {
                return (
                  <div key={category.name} className="mb-1">
                    <div
                      className="flex items-center justify-center p-2 text-sm font-medium rounded-lg transition-colors text-gray-600 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                      title={category.name}
                    >
                      <category.icon className="h-5 w-5" />
                    </div>
                  </div>
                );
              }

              return (
                <div key={category.name} className="mb-1">
                  <button
                    onClick={() => toggleCategory(category.name)}
                    className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <div className="flex items-center">
                      <category.icon className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm font-semibold">{category.name}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400 transition-transform" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400 transition-transform" />
                    )}
                  </button>

                  {isExpanded && filteredChildren.length > 0 && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                      {filteredChildren.map((child) => {
                        const isActive = pathname === child.href;

                        return (
                          <Link
                            key={child.name}
                            href={child.href || '#'}
                            onClick={onClose}
                            className={cn(
                              "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all",
                              isActive
                                ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            )}
                          >
                            <child.icon className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{child.name}</span>
                            {child.badge && child.badge > 0 && (
                              <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                                {child.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {isAdmin && !isCollapsed && (
              <div className="pt-4">
                <div className="px-3 mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Administration
                  </h3>
                </div>
                <div className="space-y-1">
                  {adminNavigation.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.name}
                        href={item.href || '#'}
                        onClick={onClose}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all",
                          isActive
                            ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        <item.icon className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </nav>

        <div className="flex-shrink-0 border-t border-gray-200 p-4">
          {!isCollapsed ? (
            <>
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-medium text-sm">
                    {getUserName().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {getUserName()}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {getUserRoleDisplay()}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              title="Déconnexion"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
