'use client';

import { useState } from 'react';
import Link from 'next/link';
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

export default function SimpleSidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white p-2 rounded shadow-md border border-gray-200"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6 text-gray-600" />
          ) : (
            <Menu className="h-6 w-6 text-gray-600" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 bottom-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-blue-600">Parabellum</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center px-3 py-2 text-sm font-medium rounded transition-colors
                    ${isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              );
            })}

            {/* Admin Section */}
            <div className="pt-6">
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Administration
                </p>
              </div>
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center px-3 py-2 text-sm font-medium rounded transition-colors
                      ${isActive
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User info */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {getUserInitials()}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{getUserName()}</p>
                <p className="text-xs text-gray-500">{getUserRole()}</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded transition-colors"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
