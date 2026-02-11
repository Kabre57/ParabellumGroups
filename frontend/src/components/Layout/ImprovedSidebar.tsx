'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  Home,
  Users,
  Wrench,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  FileText,
  CreditCard,
  Package,
  Target,
  ShoppingCart,
  UserCheck,
  BarChart,
  Tag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';

const navigation = [
  { name: 'Tableau de Bord', href: '/dashboard', icon: Home },
  { name: 'CRM', href: '/dashboard/crm/clients', icon: Building2 },
  { name: 'Types de Clients', href: '/dashboard/crm/type-clients', icon: Tag },
  { name: 'Commercial', href: '/dashboard/commercial/prospects', icon: Target },
  { name: 'Devis', href: '/dashboard/commercial/quotes', icon: FileText },
  { name: 'Facturation', href: '/dashboard/billing/invoices', icon: CreditCard },
  { name: 'Services Techniques', href: '/dashboard/technical/missions', icon: Wrench },
  { name: 'Techniciens', href: '/dashboard/technical/techniciens', icon: UserCheck },
  { name: 'Matériel', href: '/dashboard/technical/materiel', icon: Package },
  { name: 'Interventions', href: '/dashboard/technical/interventions', icon: ClipboardList },
  { name: 'Projets', href: '/dashboard/projects', icon: ClipboardList },
  { name: 'Achats', href: '/dashboard/achats/commandes', icon: ShoppingCart },
  { name: 'RH', href: '/dashboard/hr/employees', icon: Users },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart },
];

const adminNavigation = [
  { name: 'Utilisateurs', href: '/dashboard/admin/users', icon: Users },
  { name: 'Paramètres', href: '/dashboard/settings', icon: Settings },
];

interface ImprovedSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ImprovedSidebar({ isOpen = true, onClose }: ImprovedSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const getUserInitials = () => {
    if (!user) return 'U';
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getUserName = () => {
    if (!user) return 'Utilisateur';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email || 'Utilisateur';
  };

  const getUserRole = () => {
    if (!user?.role) return 'Utilisateur';
    if (typeof user.role === 'string') return user.role;
    if (typeof user.role === 'object') {
      const roleObj = user.role as any;
      return roleObj.name || roleObj.code || roleObj.label || 'Utilisateur';
    }
    return 'Utilisateur';
  };

  const handleLogout = () => {
    if (logout) logout();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-50 bg-white border-r border-gray-200 
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          
          {/* Logo Section */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
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
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">Parabellum</h1>
                    <p className="text-xs text-gray-500">ERP</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="hidden lg:block p-1.5 rounded hover:bg-gray-100 transition-colors"
                  aria-label="Réduire le menu"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsCollapsed(false)}
                className="hidden lg:block mx-auto p-1.5 rounded hover:bg-gray-100 transition-colors"
                aria-label="Étendre le menu"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            )}

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded hover:bg-gray-100 transition-colors"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all
                    ${isActive
                      ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}

            {/* Admin Section */}
            {!isCollapsed && (
              <div className="pt-6">
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Administration
                  </p>
                </div>
              </div>
            )}
            
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all
                    ${isActive
                      ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="border-t border-gray-200 p-4">
            {!isCollapsed ? (
              <>
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-medium text-sm">
                      {getUserInitials()}
                    </span>
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{getUserName()}</p>
                    <p className="text-xs text-gray-500 truncate">{getUserRole()}</p>
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
        </div>
      </aside>
    </>
  );
}
