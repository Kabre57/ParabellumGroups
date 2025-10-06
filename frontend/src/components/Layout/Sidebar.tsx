import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Users,
  FileText,
  Receipt,
  CreditCard,
  Package,
  TrendingUp,
  Settings,
  Building2,
  UserCheck,
  DollarSign,
  BarChart3,
  Calendar,
  Wrench,
  Target,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  ShoppingCart,
  ShieldCheck,
  GitBranch,
  Award,
  Clock,
  Layers,
  ShoppingBag,
  CalendarDays,
  KeyRound,
  Workflow,
  Truck,
  Warehouse,
  LineChart,
  BookOpen,
  ClipboardList,
  Briefcase,
  PhoneCall,
  Mail
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { NavigationItem } from '../../types';

// ===============================
// Structure professionnelle (catégories + enfants)
// ===============================
const professionalCategories = [
  // === DASHBOARD & ANALYTIQUES ===
  {
    name: 'Tableau de Bord',
    icon: Home,
    permission: 'dashboard.read',
    children: [
      { name: 'Tableau de bord', href: '/dashboard', icon: Home, permission: 'dashboard.read' },
      { name: 'Analytics', href: '/analytics', icon: LineChart, permission: 'reports.financial' },
    ],
  },

  // === CRM & COMMERCIAL ===
  {
    name: 'CRM & Commercial',
    icon: Target,
    permission: 'prospects.read',
    children: [
      { name: 'Prospection', href: '/commercial/prospection', icon: Target, permission: 'prospects.read' },
      { name: 'Pipeline Commercial', href: '/commercial/pipeline', icon: Workflow, permission: 'quotes.read' },
      { name: 'Portefeuille Clients', href: '/customers', icon: Users, permission: 'customers.read' },
      { name: 'Devis & Propositions', href: '/quotes', icon: FileText, permission: 'quotes.read' },
      { name: 'Facturation', href: '/invoices', icon: Receipt, permission: 'invoices.read' },
      { name: 'Suivi Paiements', href: '/payments', icon: CreditCard, permission: 'payments.read' },
    ],
  },

  // === SERVICES TECHNIQUES & INTERVENTIONS ===
  {
    name: 'Services Techniques',
    icon: Wrench,
    permission: 'missions.read',
    children: [
      { name: 'Planning Interventions', href: '/services/interventions', icon: Calendar, permission: 'interventions.read' },
      { name: 'Gestion des Missions', href: '/services/missions', icon: ClipboardList, permission: 'missions.read' },
      { name: 'Équipe Technique', href: '/services/techniciens', icon: UserCheck, permission: 'techniciens.read' },
      { name: 'Spécialités', href: '/services/specialites', icon: Award, permission: 'specialites.read' },
      { name: 'Parc Matériel', href: '/services/materiel', icon: Package, permission: 'materiels.read' },
      { name: 'Rapports d\'Intervention', href: '/services/reports', icon: FileText, permission: 'missions.read' },
    ],
  },

  // === PROJETS CLIENTS ===
  {
    name: 'Gestion de Projets',
    icon: FolderKanban,
    permission: 'projects.read',
    children: [
      { name: 'Projets Clients', href: '/projects', icon: FolderKanban, permission: 'projects.read' },
      { name: 'Planning Projets', href: '/calendar', icon: CalendarDays, permission: 'calendar.read' },
      { name: 'Feuilles de Temps', href: '/timesheets', icon: Clock, permission: 'time-entries.read' },
      { name: 'Documents Projets', href: '/project-docs', icon: FileText, permission: 'projects.read' },
    ],
  },

  // === ACHATS & LOGISTIQUE ===
  {
    name: 'Achats & Logistique',
    icon: ShoppingCart,
    permission: 'purchases.read',
    children: [
      { name: 'Catalogue Produits', href: '/purchases/products', icon: Package, permission: 'products.read' },
      { name: 'Fournisseurs', href: '/purchases/suppliers', icon: Truck, permission: 'suppliers.read' },
      { name: 'Commandes d\'Achat', href: '/purchases/orders', icon: ShoppingCart, permission: 'purchases.read' },
      { name: 'Réceptions', href: '/purchases/receipts', icon: ClipboardList, permission: 'purchases.read' },
      { name: 'Gestion des Stocks', href: '/inventory', icon: Warehouse, permission: 'inventory.read' },
      { name: 'Audit Stock', href: '/stock-audit', icon: GitBranch, permission: 'inventory.audit' },
    ],
  },

  // === COMPTABILITÉ & FINANCES ===
  {
    name: 'Comptabilité & Finances',
    icon: DollarSign,
    permission: 'invoices.read',
    children: [
      { name: 'Trésorerie', href: '/accounting/treasury', icon: DollarSign, permission: 'cash-flows.read' },
      { name: 'Plan Comptable', href: '/accounting/accounts', icon: BookOpen, permission: 'accounts.read' },
      { name: 'Gestion Dépenses', href: '/accounting/expenses', icon: TrendingUp, permission: 'expenses.read' },
      { name: 'Écritures Comptables', href: '/accounting/entries', icon: FileText, permission: 'accounting-entries.read' },
      { name: 'Rapports Financiers', href: '/reports', icon: BarChart3, permission: 'reports.financial' },
    ],
  },

  // === RESSOURCES HUMAINES ===
  {
    name: 'Ressources Humaines',
    icon: UserCheck,
    permission: 'employees.read',
    children: [
      { name: 'Effectifs', href: '/hr/employees', icon: Users, permission: 'employees.read' },
      { name: 'Contrats', href: '/hr/contracts', icon: FileText, permission: 'contracts.read' },
      { name: 'Paie & Salaires', href: '/hr/salaries', icon: DollarSign, permission: 'salaries.read' },
      { name: 'Gestion des Congés', href: '/hr/leaves', icon: Calendar, permission: 'leaves.read' },
      { name: 'Avances & Prêts', href: '/hr/loans', icon: CreditCard, permission: 'loans.read' },
      { name: 'Évaluations', href: '/hr/performance', icon: Award, permission: 'performance.read' },
    ],
  },

  // === COMMUNICATION ===
  {
    name: 'Communication',
    icon: MessageSquare,
    permission: 'messages.read',
    children: [
      { name: 'Messagerie Interne', href: '/messages', icon: MessageSquare, permission: 'messages.read' },
      { name: 'Contacts Clients', href: '/contacts', icon: PhoneCall, permission: 'customers.read' },
      { name: 'Campagnes Email', href: '/email-campaigns', icon: Mail, permission: 'marketing.read' },
    ],
  },

  // === ADMINISTRATION & CONFIGURATION ===
  {
    name: 'Administration',
    icon: Settings,
    permission: 'admin.system_settings',
    children: [
      { name: 'Utilisateurs & Accès', href: '/admin/users', icon: UserCheck, permission: 'users.read' },
      { name: 'Services & Départements', href: '/admin/services', icon: Building2, permission: 'admin.system_settings' },
      { name: 'Gestion des Permissions', href: '/admin/permissions', icon: ShieldCheck, permission: 'users.manage_permissions' },
      { name: 'Paramètres Commerciaux', href: '/commercial/permissions', icon: KeyRound, permission: 'admin.system_settings' },
      { name: 'Journal d\'Audit', href: '/admin/audit', icon: ClipboardList, permission: 'admin.system_settings' },
    ],
  },
];

// ===============================
// Accès Rapide (base) + Raccourcis Employé
// ===============================

// patched: Employé — ajouter 2 raccourcis projets
const employeeProjectShortcuts: NavigationItem[] = [
  { name: 'Planning Projets', href: '/calendar', icon: CalendarDays, permission: 'calendar.read' },
  { name: 'Feuilles de Temps', href: '/timesheets', icon: Clock, permission: 'time-entries.read' },
];

const quickAccessItems: NavigationItem[] = [
  { name: 'Tableau de bord', href: '/dashboard', icon: Home, permission: 'dashboard.read' },
  { name: 'Nouveau Devis', href: '/quotes?action=create', icon: FileText, permission: 'quotes.create' },
  { name: 'Nouvelle Intervention', href: '/services/interventions?action=create', icon: Wrench, permission: 'interventions.create' },
  { name: 'Saisie Dépense', href: '/accounting/expenses?action=create', icon: DollarSign, permission: 'expenses.create' },
  { name: 'Commande d\'Achat', href: '/purchases/orders?action=create', icon: ShoppingCart, permission: 'purchases.create' },
];

interface SidebarProps {
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { hasPermission, user } = useAuth();

  // patched: helper rôle — une seule déclaration
  const isEmployee = user?.role === 'EMPLOYEE';

  // patched: helpers pour construire Accès Rapide employé
  const flattenCategoryChildren = (categories: any[]): NavigationItem[] => {
    return categories.flatMap((cat: any) =>
      (cat.children ?? []).map((child: any) => ({
        name: child.name,
        href: child.href,
        icon: child.icon,
        permission: child.permission,
      }))
    );
  };
  const uniqByHref = (items: NavigationItem[]) => {
    const seen = new Set<string>();
    return items.filter((i) => {
      if (!i.href) return false;
      if (seen.has(i.href)) return false;
      seen.add(i.href);
      return true;
    });
  };

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Tableau de Bord': true,
    'CRM & Commercial': false,
    'Services Techniques': false,
    'Gestion de Projets': false,
    'Achats & Logistique': false,
    'Comptabilité & Finances': false,
    'Ressources Humaines': false,
    'Communication': false,
    'Administration': false,
  });

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  // ===============================
  // Filtrage Permissions
  // ===============================
  const filterNavigationItems = (items: NavigationItem[]): NavigationItem[] => {
    return items.filter(item => {
      if (user?.role === 'ADMIN') return true;
      if (!item.permission) return true;
      return hasPermission(item.permission);
    });
  };

  const filterCategoryItems = (items: any[]) => {
    // patched-hide-projects: pour EMPLOYEE, masquer la catégorie "Gestion de Projets"
    const hideProjectCategory = (item: any) => isEmployee && item?.name === 'Gestion de Projets';
    return items.filter(item => {
      if (hideProjectCategory(item)) return false;
      if (user?.role === 'ADMIN') return true;
      if (!item.permission) return true;
      if (hasPermission(item.permission)) return true;

      if (item.children) {
        const accessibleChildren = item.children.filter((child: any) =>
          !child.permission || hasPermission(child.permission)
        );
        return accessibleChildren.length > 0;
      }
      return false;
    });
  };

  const filterCategoryChildren = (children: any[]) => {
    return children.filter((child: any) => {
      if (user?.role === 'ADMIN') return true;
      if (!child.permission) return true;
      return hasPermission(child.permission);
    });
  };

  // ===============================
  // Accès Rapide visible
  // ===============================
  let visibleQuickAccess: NavigationItem[];
  if (isEmployee) {
    // EMPLOYÉ → QuickAccess = 2 raccourcis projets + QuickAccess de base + TOUS les sous-liens accessibles
    const base = filterNavigationItems(quickAccessItems);
    const projShortcuts = filterNavigationItems(employeeProjectShortcuts);
    const allModuleChildren = flattenCategoryChildren(professionalCategories);
    const allowedChildren = filterNavigationItems(allModuleChildren);
    // fusion + dédoublonnage par href
    visibleQuickAccess = uniqByHref([...projShortcuts, ...base, ...allowedChildren]);
  } else {
    // autres rôles → QuickAccess normal
    visibleQuickAccess = filterNavigationItems(quickAccessItems);
  }

  const visibleCategories = filterCategoryItems(professionalCategories);

  // Affichage rôle lisible
  const getUserRoleDisplay = () => {
    const roles = {
      'ADMIN': 'Administrateur',
      'GENERAL_DIRECTOR': 'Directeur Général',
      'SERVICE_MANAGER': 'Responsable Service',
      'EMPLOYEE': 'Collaborateur',
      'ACCOUNTANT': 'Comptable',
      'PURCHASING_MANAGER': 'Responsable Achats'
    };
    return roles[user?.role as keyof typeof roles] || 'Utilisateur';
  };

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 dark:bg-gray-950 transform transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } lg:translate-x-0 lg:static lg:inset-0 flex flex-col border-r border-gray-700`}>
      
      {/* Header avec logo */}
      <div className="flex-shrink-0 flex items-center justify-center h-16 bg-gray-800 dark:bg-gray-900 px-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">PG</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-white text-lg font-bold leading-tight">Parabellum</h1>
            <span className="text-gray-300 text-xs">ERP Professionnel</span>
          </div>
        </div>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 scrollbar-custom overflow-y-auto">
        <div className="px-4 space-y-1 py-4">
          
          {/* Accès Rapide */}
          <div className="mb-6">
            <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Accès Rapide
            </h3>
            <div className="space-y-1">
              {visibleQuickAccess.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href!}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 mb-1 border ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg transform scale-105'
                        : 'text-gray-300 border-transparent hover:bg-gray-800 hover:border-gray-600 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.name}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-700 my-4"></div>

          {/* Modules métier */}
          {/* patched: EMPLOYÉ → on masque entièrement le bloc catégories (tout est déjà dans Accès Rapide) */}
          {!isEmployee && (
            <>
              <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Modules Métier
              </h3>

              {visibleCategories.map((category) => {
                const filteredChildren = category.children ? filterCategoryChildren(category.children) : [];
                
                if (filteredChildren.length === 0 && user?.role !== 'ADMIN') {
                  return null;
                }

                return (
                  <div key={category.name} className="mb-2">
                    <button
                      onClick={() => toggleCategory(category.name)}
                      className="flex items-center justify-between w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-gray-800 hover:text-white group border border-transparent hover:border-gray-600"
                    >
                      <div className="flex items-center">
                        <category.icon className="mr-3 h-4 w-4 group-hover:text-blue-400" />
                        <span className="text-sm font-semibold">{category.name}</span>
                      </div>
                      {expandedCategories[category.name] ? (
                        <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-white" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-white" />
                      )}
                    </button>

                    {expandedCategories[category.name] && filteredChildren.length > 0 && (
                      <div className="ml-2 mt-2 space-y-1 border-l-2 border-gray-600 pl-3">
                        {filteredChildren.map((child: any) => (
                          <NavLink
                            key={child.name}
                            to={child.href}
                            className={({ isActive }) =>
                              `flex items-center px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                                isActive
                                  ? 'bg-blue-600 text-white shadow-md border-l-4 border-blue-400'
                                  : 'text-gray-400 hover:bg-gray-800 hover:text-white border-l-2 border-transparent'
                              }`
                            }
                          >
                            <child.icon className="mr-2 h-3 w-3" />
                            {child.name}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* Indicateur de statut */}
          <div className="mt-6 p-3 bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg border border-gray-600">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-300">Statut Système</span>
              <div className="flex items-center">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-xs text-green-400">En ligne</span>
              </div>
            </div>
            <div className="text-xs text-gray-400 flex justify-between">
              <span>Utilisateur: {user?.firstName}</span>
              <span>Rôle: {getUserRoleDisplay()}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-700 p-4 bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                <Settings className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                v1.0.0 • Production
              </p>
              <p className="text-xs text-gray-400 truncate">
                {new Date().getFullYear()} • Parabellum Groups
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
