'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  CalendarDays,
  KeyRound,
  Workflow,
  Truck,
  Warehouse,
  LineChart,
  BookOpen,
  ClipboardList,
  PhoneCall,
  Mail,
  HelpCircle,
  Search,
  Star,
  X,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/lib/utils';

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

// ===============================
// Structure (catégories + enfants)
// ===============================
const professionalCategories: CategoryItem[] = [
  // === DASHBOARD & ANALYTIQUES ===
  {
    name: 'Tableau de Bord',
    icon: Home,
    permission: 'dashboard.read',
    children: [
      { name: 'Tableau de bord', href: '/dashboard', icon: Home, permission: 'dashboard.read' },
      { name: 'Analytics', href: '/dashboard/analytics', icon: LineChart, permission: 'reports.financial' },
    ],
  },

  // === COMMERCIAL (Microservice commercial-service) ===
  {
    name: 'Commercial',
    icon: Target,
    permission: 'prospects.read',
    children: [
      { name: 'Workflow Prospection', href: '/dashboard/commercial/prospects', icon: Target, permission: 'prospects.read' },
      { name: 'Pipeline Commercial', href: '/dashboard/commercial/pipeline', icon: Workflow, permission: 'prospects.read' },
      { name: 'Devis & Propositions', href: '/dashboard/commercial/quotes', icon: FileText, permission: 'quotes.read' },
    ],
  },

  // === CRM & CLIENTS (Microservice customer-service) ===
  {
    name: 'CRM & Clients',
    icon: Users,
    permission: 'customers.read',
    children: [
      { name: 'Clients', href: '/dashboard/clients', icon: Users, permission: 'customers.read' },
      { name: 'Contacts', href: '/dashboard/contacts', icon: PhoneCall, permission: 'customers.read' },
      { name: 'Historique Interactions', href: '/dashboard/clients/interactions', icon: MessageSquare, permission: 'customers.read' },
    ],
  },

  // === FACTURATION (Microservice billing-service) ===
  {
    name: 'Facturation',
    icon: Receipt,
    permission: 'invoices.read',
    children: [
      { name: 'Factures', href: '/dashboard/facturation', icon: Receipt, permission: 'invoices.read' },
      { name: 'Suivi Paiements', href: '/dashboard/facturation/paiements', icon: CreditCard, permission: 'payments.read' },
      { name: 'Avoirs & Remboursements', href: '/dashboard/facturation/avoirs', icon: FileText, permission: 'invoices.read' },
    ],
  },

  // === SERVICES TECHNIQUES (Microservice technical-service) ===
  {
    name: 'Services Techniques',
    icon: Wrench,
    permission: 'missions.read',
    children: [
      { name: 'Planning Interventions', href: '/dashboard/technical/interventions', icon: Calendar, permission: 'interventions.read' },
      { name: 'Gestion des Missions', href: '/dashboard/technical/missions', icon: ClipboardList, permission: 'missions.read' },
      { name: 'Équipe Technique', href: '/dashboard/technical/techniciens', icon: UserCheck, permission: 'techniciens.read' },
      { name: 'Spécialités', href: '/dashboard/technical/specialites', icon: Award, permission: 'specialites.read' },
      { name: 'Rapports d\'Intervention', href: '/dashboard/technical/rapports', icon: FileText, permission: 'missions.read' },
    ],
  },

  // === PROJETS CLIENTS (Microservice project-service) ===
  {
    name: 'Gestion de Projets',
    icon: FolderKanban,
    permission: 'projects.read',
    children: [
      { name: 'Projets', href: '/dashboard/projets', icon: FolderKanban, permission: 'projects.read' },
      { name: 'Tâches & Planning', href: '/dashboard/projets/taches', icon: ClipboardList, permission: 'projects.read' },
      { name: 'Jalons', href: '/dashboard/projets/jalons', icon: Award, permission: 'projects.read' },
      { name: 'Planning Gantt', href: '/dashboard/projets/planning', icon: CalendarDays, permission: 'calendar.read' },
      { name: 'Feuilles de Temps', href: '/dashboard/timesheets', icon: Clock, permission: 'time-entries.read' },
    ],
  },

  // === ACHATS & LOGISTIQUE (Microservice procurement-service) ===
  {
    name: 'Achats & Logistique',
    icon: ShoppingCart,
    permission: 'purchases.read',
    children: [
      { name: 'Catalogue Produits', href: '/dashboard/achats/produits', icon: Package, permission: 'products.read' },
      { name: 'Fournisseurs', href: '/dashboard/achats/fournisseurs', icon: Truck, permission: 'suppliers.read' },
      { name: 'Commandes d\'Achat', href: '/dashboard/achats/commandes', icon: ShoppingCart, permission: 'purchases.read' },
      { name: 'Réceptions', href: '/dashboard/achats/receptions', icon: ClipboardList, permission: 'purchases.read' },
      { name: 'Gestion des Stocks', href: '/dashboard/achats/stock', icon: Warehouse, permission: 'inventory.read' },
      { name: 'Audit Stock', href: '/dashboard/achats/audit', icon: GitBranch, permission: 'inventory.audit' },
    ],
  },

  // === RH & PAIE (Microservice hr-service) ===
  {
    name: 'Ressources Humaines',
    icon: UserCheck,
    permission: 'employees.read',
    children: [
      { name: 'Effectifs', href: '/dashboard/rh/employes', icon: Users, permission: 'employees.read' },
      { name: 'Contrats', href: '/dashboard/rh/contrats', icon: FileText, permission: 'contracts.read' },
      { name: 'Paie & Salaires', href: '/dashboard/rh/paie', icon: DollarSign, permission: 'salaries.read' },
      { name: 'Gestion des Congés', href: '/dashboard/rh/conges', icon: Calendar, permission: 'leaves.read' },
      { name: 'Avances & Prêts', href: '/dashboard/rh/prets', icon: CreditCard, permission: 'loans.read' },
      { name: 'Évaluations', href: '/dashboard/rh/evaluations', icon: Award, permission: 'performance.read' },
    ],
  },

  // === COMMUNICATION ===
  {
    name: 'Communication',
    icon: MessageSquare,
    permission: 'messages.read',
    children: [
      { name: 'Messagerie Interne', href: '/dashboard/messages', icon: MessageSquare, permission: 'messages.read' },
      { name: 'Contacts Clients', href: '/dashboard/contacts', icon: PhoneCall, permission: 'customers.read' },
      { name: 'Campagnes Email', href: '/dashboard/email-campaigns', icon: Mail, permission: 'marketing.read' },
    ],
  },

    // === ADMINISTRATION ===
    {
      name: 'Administration',
      icon: Shield,
      permission: 'admin',
      children: [
        { name: 'Utilisateurs', href: '/dashboard/admin/users', icon: Users, permission: 'admin' },
        { name: 'Rôles', href: '/dashboard/admin/roles-management', icon: Shield, permission: 'admin' },
        { name: 'Permissions', href: '/dashboard/admin/permissions', icon: ShieldCheck, permission: 'admin' },
        { name: 'Services', href: '/dashboard/admin/services', icon: Building2, permission: 'admin' },
        { name: 'Paramètres Système', href: '/dashboard/settings', icon: Settings, permission: 'admin' },
      ],
    },
];

// Accès Rapide (base) + Raccourcis Employé
const employeeProjectShortcuts: NavigationItem[] = [
  { name: 'Planning Projets', href: '/dashboard/calendar', icon: CalendarDays, permission: 'calendar.read' },
  { name: 'Feuilles de Temps', href: '/dashboard/timesheets', icon: Clock, permission: 'time-entries.read' },
];

const quickAccessItems: NavigationItem[] = [
  { name: 'Tableau de bord', href: '/dashboard', icon: Home, permission: 'dashboard.read' },
  { name: 'Nouveau Devis', href: '/dashboard/quotes?action=create', icon: FileText, permission: 'quotes.create' },
  { name: 'Nouvelle Intervention', href: '/dashboard/technical/interventions?action=create', icon: Wrench, permission: 'interventions.create' },
  { name: 'Saisie Dépense', href: '/dashboard/comptabilite/depenses?action=create', icon: DollarSign, permission: 'expenses.create' },
  { name: "Commande d'Achat", href: '/dashboard/achats/commandes?action=create', icon: ShoppingCart, permission: 'purchases.create' },
];

// Administration items
const adminNavigation: NavigationItem[] = [
  { name: 'Utilisateurs', href: '/dashboard/admin/users', icon: Users, permission: 'admin' },
  { name: 'Rôles', href: '/dashboard/admin/roles-management', icon: Shield, permission: 'admin' },
  { name: 'Services', href: '/dashboard/admin/services', icon: Building2, permission: 'admin' },
  { name: 'Permissions', href: '/dashboard/admin/permissions', icon: ShieldCheck, permission: 'admin' },
  { name: 'Paramètres', href: '/dashboard/settings', icon: Settings, permission: 'admin' },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

  // CORRECTION : Vérification robuste du rôle
  const isEmployee = useMemo(() => {
    if (!user?.role) return false;
    
    // Si role est une string
    if (typeof user.role === 'string') {
      return user.role === 'EMPLOYEE';
    }
    
    // Si role est un objet avec code
    if (user.role && typeof user.role === 'object') {
      const roleObj = user.role as any;
      return roleObj.code === 'EMPLOYEE' || roleObj.name === 'EMPLOYEE';
    }
    
    return false;
  }, [user]);

  const isAdmin = useMemo(() => {
    if (!user?.role) return false;
    
    // Si role est une string
    if (typeof user.role === 'string') {
      return user.role === 'ADMIN';
    }
    
    // Si role est un objet avec code
    if (user.role && typeof user.role === 'object') {
      const roleObj = user.role as any;
      return roleObj.code === 'ADMIN' || roleObj.name === 'ADMIN';
    }
    
    return false;
  }, [user]);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Tableau de Bord': true,
    'Commercial': false,
    'CRM & Clients': false,
    'Facturation': false,
    'Services Techniques': false,
    'Gestion de Projets': false,
    'Achats & Logistique': false,
    'Ressources Humaines': false,
    'Communication': false,

  });

  // Fonction pour vérifier l'accès (simulé - à adapter selon votre système de permissions)
  const hasAccess = useCallback((item: NavigationItem) => {
    if (!item.permission) return true;
    if (isAdmin) return true;
    // À implémenter : vérification réelle des permissions
    return true;
  }, [isAdmin]);

  // Toggle catégorie avec mémorisation
  const toggleCategory = useCallback((categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  }, []);

  // Toggle favoris
  const toggleFavorite = useCallback((href: string) => {
    setFavorites(prev =>
      prev.includes(href)
        ? prev.filter(f => f !== href)
        : [...prev, href]
    );
  }, []);

  // Filtrer les items par recherche
  const filterBySearch = useCallback((items: NavigationItem[]) => {
    if (!searchQuery) return items;
    return items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Construire l'accès rapide pour employés
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
  }, [isEmployee, hasAccess]);

  // Filtrer les catégories
  const visibleCategories = useMemo(() => {
    return professionalCategories.filter(category => {
      if (isEmployee && category.name === 'Gestion de Projets') return false;
      if (isAdmin) return true;
      if (hasAccess(category)) return true;
      if (category.children) {
        return category.children.some(child => hasAccess(child));
      }
      return false;
    });
  }, [isEmployee, isAdmin, hasAccess]);

  // CORRECTION : Affichage rôle lisible - SIMPLIFIÉ
  const getUserRoleDisplay = () => {
    if (!user?.role) return 'Utilisateur';
    
    // Si role est une string, retourner directement
    if (typeof user.role === 'string') {
      const roles: Record<string, string> = {
        'ADMIN': 'Administrateur',
        'GENERAL_DIRECTOR': 'Directeur Général',
        'SERVICE_MANAGER': 'Responsable Service',
        'EMPLOYEE': 'Collaborateur',
        'ACCOUNTANT': 'Comptable',
        'PURCHASING_MANAGER': 'Responsable Achats'
      };
      return roles[user.role] || user.role;
    }
    
    // Si role est un objet, utiliser name ou code
    if (user.role && typeof user.role === 'object') {
      const roleObj = user.role as any;
      
      // Si l'objet a un nom lisible, l'utiliser
      if (roleObj.name && typeof roleObj.name === 'string') {
        const roles: Record<string, string> = {
          'ADMIN': 'Administrateur',
          'GENERAL_DIRECTOR': 'Directeur Général',
          'SERVICE_MANAGER': 'Responsable Service',
          'EMPLOYEE': 'Collaborateur',
          'ACCOUNTANT': 'Comptable',
          'PURCHASING_MANAGER': 'Responsable Achats'
        };
        return roles[roleObj.name] || roleObj.name;
      }
      
      // Sinon utiliser code
      if (roleObj.code && typeof roleObj.code === 'string') {
        const roles: Record<string, string> = {
          'ADMIN': 'Administrateur',
          'GENERAL_DIRECTOR': 'Directeur Général',
          'SERVICE_MANAGER': 'Responsable Service',
          'EMPLOYEE': 'Collaborateur',
          'ACCOUNTANT': 'Comptable',
          'PURCHASING_MANAGER': 'Responsable Achats'
        };
        return roles[roleObj.code] || roleObj.code;
      }
      
      // Si c'est un objet complexe, retourner une string simple
      return 'Utilisateur';
    }
    
    return 'Utilisateur';
  };

  // CORRECTION : Nom d'utilisateur sécurisé
  const getUserName = () => {
    if (!user) return 'Utilisateur';
    
    // Si user a un nom
    if (user.name && typeof user.name === 'string') {
      return user.name;
    }
    
    // Si user a un email
    if (user.email && typeof user.email === 'string') {
      return user.email.split('@')[0]; // Retirer le domaine
    }
    
    // Si user a un username
    if (user.username && typeof user.username === 'string') {
      return user.username;
    }
    
    return 'Utilisateur';
  };

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 transform transition-transform duration-300 ease-in-out flex flex-col border-r border-gray-200 dark:border-gray-700",
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0 lg:static lg:inset-0'
      )}
    >
      {/* Header avec logo */}
      <div className="flex-shrink-0 flex items-center justify-between h-16 bg-gray-50 dark:bg-gray-800 px-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-gray-900 dark:text-white text-lg font-bold leading-tight">Parabellum Groups</h1>
            <span className="text-gray-600 dark:text-gray-300 text-xs">ERP</span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-700 scrollbar-track-gray-100 dark:scrollbar-track-gray-900">
        <div className="px-4 space-y-1 py-4">

          {visibleCategories.map((category) => {
            const filteredChildren = category.children?.filter(hasAccess) || [];
            
            if (filteredChildren.length === 0 && !isAdmin) {
              return null;
            }

            const isExpanded = expandedCategories[category.name];

            return (
              <div key={category.name} className="mb-2">
                <button
                  onClick={() => toggleCategory(category.name)}
                  className="flex items-center justify-between w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white group border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                >
                  <div className="flex items-center">
                    <category.icon className="mr-3 h-4 w-4 group-hover:text-blue-400 flex-shrink-0" />
                    <span className="text-sm font-semibold">{category.name}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-transform duration-200" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-transform duration-200" />
                  )}
                </button>

                {isExpanded && filteredChildren.length > 0 && (
                  <div className="ml-2 mt-2 space-y-1 border-l-2 border-gray-300 dark:border-gray-600 pl-3 animate-in slide-in-from-top-2 duration-200">
                    {filteredChildren.map((child) => {
                      const isActive = pathname === child.href;

                      return (
                        <Link
                          key={child.name}
                          href={child.href || '#'}
                          onClick={onClose}
                          className={cn(
                            "flex items-center px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 border-l-2",
                            isActive
                              ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white border-transparent'
                          )}
                        >
                          <child.icon className="mr-2 h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{child.name}</span>
                          {child.badge && (
                            <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
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

          {/* Administration - CORRECTION : toujours visible pour les admins */}
          {isAdmin && (
            <div className="pt-6">
              <div className="px-4 mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
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
                        "flex items-center px-3 py-2 mx-1 text-sm font-medium rounded-lg transition-all duration-200",
                        isActive
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                      )}
                    >
                      <item.icon className={cn(
                        "mr-3 h-4 w-4 flex-shrink-0",
                        isActive 
                          ? "text-white" 
                          : "text-purple-500 dark:text-purple-400"
                      )} />
                      <span className="font-medium">{item.name}</span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse"></div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                <Settings className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                v1.0.0 • BÊTA
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {new Date().getFullYear()} • Parabellum Groups
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="text-right">
              <p className="text-xs font-medium text-gray-900 dark:text-white">
                {getUserName()}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {getUserRoleDisplay()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;