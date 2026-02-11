'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  FileSignature,
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
  FileCheck,
  X,
  Shield,
  BarChart,
  Building,
  Tag,
  ChevronLeft,
  LogOut,
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

// === CRM (Microservice customer-service) ===
{
  name: 'CRM',
  icon: Users,
  permission: 'customers.read',
  children: [
    { name: 'CRM', href: '/dashboard/crm', icon: Users, permission: 'customers.read' },
    { name: 'Clients', href: '/dashboard/crm/clients', icon: Users, permission: 'customers.read' },
    { name: 'Types de Clients', href: '/dashboard/crm/type-clients', icon: Users, permission: 'customers.read' },
    { name: 'Contacts', href: '/dashboard/crm/contacts', icon: PhoneCall, permission: 'customers.read' },
    { name: 'Contrats', href: '/dashboard/crm/contracts', icon: FileCheck, permission: 'customers.read' },
    { name: 'Documents', href: '/dashboard/crm/documents', icon: FileText, permission: 'customers.read' },
    { name: 'Historique Interactions', href: '/dashboard/crm/interactions', icon: MessageSquare, permission: 'customers.read' },
    { name: 'Opportunités', href: '/dashboard/crm/opportunities', icon: TrendingUp, permission: 'opportunities.read' },
    { name: 'Rapports', href: '/dashboard/crm/reports', icon: BarChart, permission: 'reports.read' },
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
      { name: 'Gestion du Matériel', href: '/dashboard/technical/materiel', icon: Package, permission: 'materiel.read' },
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
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // CORRECTION 1: Vérification robuste du rôle avec typecasting approprié
  const isEmployee = useMemo(() => {
    if (!user?.role) return false;
    
    // Vérification plus flexible pour éviter l'erreur TypeScript
    const role = user.role;
    
    // Si role est une string
    if (typeof role === 'string') {
      return role.toUpperCase() === 'EMPLOYEE';
    }
    
    // Si role est un objet, vérifier les propriétés possibles
    if (role && typeof role === 'object') {
      const roleObj = role as any;
      
      // Vérifier plusieurs propriétés possibles (code, name, value, etc.)
      const roleValue = roleObj.code || roleObj.name || roleObj.value || roleObj.role;
      
      if (roleValue && typeof roleValue === 'string') {
        return roleValue.toUpperCase() === 'EMPLOYEE';
      }
      
      // Si c'est un objet avec une propriété stringify-able
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
    
    // Si role est une string
    if (typeof role === 'string') {
      const upperRole = role.toUpperCase();
      return upperRole === 'ADMIN' || upperRole === 'ADMINISTRATOR' || upperRole === 'ADMINISTRATEUR';
    }
    
    // Si role est un objet
    if (role && typeof role === 'object') {
      const roleObj = role as any;
      
      // Vérifier le CODE du rôle (recommandé)
      if (roleObj.code) {
        const upperCode = roleObj.code.toUpperCase();
        return upperCode === 'ADMIN' || upperCode === 'ADMINISTRATOR';
      }
      
      // Vérifier le NAME du rôle
      if (roleObj.name) {
        const upperName = roleObj.name.toUpperCase();
        return upperName === 'ADMIN' || upperName === 'ADMINISTRATOR' || upperName === 'ADMINISTRATEUR';
      }
      
      // Autres propriétés possibles
      const roleValue = roleObj.value || roleObj.role;
      if (roleValue && typeof roleValue === 'string') {
        const upperValue = roleValue.toUpperCase();
        return upperValue === 'ADMIN' || upperValue === 'ADMINISTRATOR' || upperValue === 'ADMINISTRATEUR';
      }
      
      // Vérification toString en dernier recours
      if (roleObj.toString && typeof roleObj.toString === 'function') {
        const strValue = roleObj.toString().toUpperCase();
        return strValue.includes('ADMIN');
      }
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

  // CORRECTION 2: Affichage rôle lisible avec typage sécurisé
  const getUserRoleDisplay = () => {
    if (!user?.role) return 'Utilisateur';
    
    const role = user.role;
    
    // Si role est une string simple
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
    
    // Si role est un objet
    if (role && typeof role === 'object') {
      const roleObj = role as any;
      
      // Essayer plusieurs propriétés possibles
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
      
      // Si c'est un objet complexe, retourner une string simple
      return 'Utilisateur';
    }
    
    return 'Utilisateur';
  };

  // CORRECTION 3: Nom d'utilisateur sécurisé avec vérification des propriétés
  const getUserName = () => {
    if (!user) return 'Utilisateur';
    
    // CORRECTION: Utiliser les propriétés existantes dans le type User
    // Selon UserMenu.tsx, le user a firstName et lastName
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    
    // CORRECTION: Vérifier si la propriété existe avant de l'utiliser
    // Ne pas utiliser 'name' car il n'existe pas dans le type User
    // Utiliser plutôt email comme fallback
    if (user.email && typeof user.email === 'string') {
      return user.email.split('@')[0]; // Retirer le domaine
    }
    
    // CORRECTION: Ne pas utiliser 'username' car il n'existe pas
    // Utiliser un fallback générique
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
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out flex flex-col",
          isCollapsed ? 'w-20' : 'w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        )}
      >
        {/* Header avec logo */}
        <div className="flex-shrink-0 flex items-center justify-between h-16 px-4 border-b border-gray-200">
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
                  <h1 className="text-gray-900 text-base font-bold leading-tight">Parabellum</h1>
                  <span className="text-gray-500 text-xs">ERP</span>
                </div>
              </div>
              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:block p-1.5 rounded hover:bg-gray-100 transition-colors"
                aria-label="Réduire"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsCollapsed(false)}
              className="hidden lg:block mx-auto p-1.5 rounded hover:bg-gray-100 transition-colors"
              aria-label="Étendre"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden text-gray-600 hover:text-gray-900"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

      {/* Barre de recherche */}
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

      {/* Navigation principale */}
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

          {/* Administration : toujours visible pour les admins */}
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

      {/* Footer */}
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