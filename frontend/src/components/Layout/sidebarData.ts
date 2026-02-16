import {
  Home,
  Users,
  FileText,
  FileCheck,
  Receipt,
  CreditCard,
  Package,
  TrendingUp,
  Settings,
  Building2,
  UserCheck,
  DollarSign,
  Calendar,
  Wrench,
  Target,
  MessageSquare,
  FolderKanban,
  ShoppingCart,
  ShieldCheck,
  GitBranch,
  Award,
  Clock,
  CalendarDays,
  Workflow,
  Truck,
  Warehouse,
  LineChart,
  BookOpen,
  ClipboardList,
  PhoneCall,
  Mail,
  BarChart,
  Shield,
} from 'lucide-react';

export interface SidebarCategory {
  id: string;
  name: string;
  icon: any;
  permission?: string;
}

export interface SidebarItem {
  name: string;
  href: string;
  icon: any;
  permission?: string;
  categoryId?: string;
  badge?: number;
}

export const sidebarCategories: SidebarCategory[] = [
  { id: 'dashboard', name: 'Tableau de Bord', icon: Home, permission: 'dashboard.read' },
  { id: 'commercial', name: 'Commercial', icon: Target, permission: 'prospects.read' },
  { id: 'crm', name: 'CRM', icon: Users, permission: 'customers.read' },
  { id: 'billing', name: 'Facturation', icon: Receipt, permission: 'invoices.read' },
  { id: 'technical', name: 'Services Techniques', icon: Wrench, permission: 'missions.read' },
  { id: 'projects', name: 'Gestion de Projets', icon: FolderKanban, permission: 'projects.read' },
  { id: 'procurement', name: 'Achats & Logistique', icon: ShoppingCart, permission: 'purchases.read' },
  { id: 'hr', name: 'Ressources Humaines', icon: UserCheck, permission: 'employees.read' },
  { id: 'communication', name: 'Communication', icon: MessageSquare, permission: 'messages.read' },
];

export const sidebarItems: SidebarItem[] = [
  { name: 'Tableau de bord', href: '/dashboard', icon: Home, permission: 'dashboard.read', categoryId: 'dashboard' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: LineChart, permission: 'reports.financial', categoryId: 'dashboard' },

  { name: 'Workflow Prospection', href: '/dashboard/commercial/prospects', icon: Target, permission: 'prospects.read', categoryId: 'commercial' },
  { name: 'Pipeline Commercial', href: '/dashboard/commercial/pipeline', icon: Workflow, permission: 'prospects.read', categoryId: 'commercial' },
  { name: 'Devis & Propositions', href: '/dashboard/commercial/quotes', icon: FileText, permission: 'quotes.read', categoryId: 'commercial' },

  { name: 'CRM', href: '/dashboard/crm', icon: Users, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Clients', href: '/dashboard/crm/clients', icon: Users, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Types de Clients', href: '/dashboard/crm/type-clients', icon: Users, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Contacts', href: '/dashboard/crm/contacts', icon: PhoneCall, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Contrats', href: '/dashboard/crm/contracts', icon: FileCheck, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Documents', href: '/dashboard/crm/documents', icon: FileText, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Historique Interactions', href: '/dashboard/crm/interactions', icon: MessageSquare, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Opportunités', href: '/dashboard/crm/opportunities', icon: TrendingUp, permission: 'opportunities.read', categoryId: 'crm' },
  { name: 'Rapports', href: '/dashboard/crm/reports', icon: BarChart, permission: 'reports.read', categoryId: 'crm' },

  { name: 'Factures', href: '/dashboard/facturation', icon: Receipt, permission: 'invoices.read', categoryId: 'billing' },
  { name: 'Suivi Paiements', href: '/dashboard/facturation/paiements', icon: CreditCard, permission: 'payments.read', categoryId: 'billing' },
  { name: 'Avoirs & Remboursements', href: '/dashboard/facturation/avoirs', icon: FileText, permission: 'invoices.read', categoryId: 'billing' },

  { name: 'Planning Interventions', href: '/dashboard/technical/interventions', icon: Calendar, permission: 'interventions.read', categoryId: 'technical' },
  { name: 'Gestion des Missions', href: '/dashboard/technical/missions', icon: ClipboardList, permission: 'missions.read', categoryId: 'technical' },
  { name: 'Équipe Technique', href: '/dashboard/technical/techniciens', icon: UserCheck, permission: 'techniciens.read', categoryId: 'technical' },
  { name: 'Spécialités', href: '/dashboard/technical/specialites', icon: Award, permission: 'specialites.read', categoryId: 'technical' },
  { name: 'Gestion du Matériel', href: '/dashboard/technical/materiel', icon: Package, permission: 'materiel.read', categoryId: 'technical' },
  { name: 'Rapports d\'Intervention', href: '/dashboard/technical/rapports', icon: FileText, permission: 'missions.read', categoryId: 'technical' },

  { name: 'Projets', href: '/dashboard/projets', icon: FolderKanban, permission: 'projects.read', categoryId: 'projects' },
  { name: 'Tâches & Planning', href: '/dashboard/projets/taches', icon: ClipboardList, permission: 'projects.read', categoryId: 'projects' },
  { name: 'Jalons', href: '/dashboard/projets/jalons', icon: Award, permission: 'projects.read', categoryId: 'projects' },
  { name: 'Planning Gantt', href: '/dashboard/projets/planning', icon: CalendarDays, permission: 'calendar.read', categoryId: 'projects' },
  { name: 'Feuilles de Temps', href: '/dashboard/timesheets', icon: Clock, permission: 'time-entries.read', categoryId: 'projects' },

  { name: 'Catalogue Produits', href: '/dashboard/achats/produits', icon: Package, permission: 'products.read', categoryId: 'procurement' },
  { name: 'Fournisseurs', href: '/dashboard/achats/fournisseurs', icon: Truck, permission: 'suppliers.read', categoryId: 'procurement' },
  { name: 'Commandes d\'Achat', href: '/dashboard/achats/commandes', icon: ShoppingCart, permission: 'purchases.read', categoryId: 'procurement' },
  { name: 'Réceptions', href: '/dashboard/achats/receptions', icon: ClipboardList, permission: 'purchases.read', categoryId: 'procurement' },
  { name: 'Gestion des Stocks', href: '/dashboard/achats/stock', icon: Warehouse, permission: 'inventory.read', categoryId: 'procurement' },
  { name: 'Audit Stock', href: '/dashboard/achats/audit', icon: GitBranch, permission: 'inventory.count', categoryId: 'procurement' },

  { name: 'Effectifs', href: '/dashboard/rh/employes', icon: Users, permission: 'employees.read', categoryId: 'hr' },
  { name: 'Contrats', href: '/dashboard/rh/contrats', icon: FileText, permission: 'contracts.read', categoryId: 'hr' },
  { name: 'Paie & Salaires', href: '/dashboard/rh/paie', icon: DollarSign, permission: 'salaries.read', categoryId: 'hr' },
  { name: 'Gestion des Congés', href: '/dashboard/rh/conges', icon: Calendar, permission: 'leaves.read', categoryId: 'hr' },
  { name: 'Avances & Prêts', href: '/dashboard/rh/prets', icon: CreditCard, permission: 'loans.read', categoryId: 'hr' },
  { name: 'Évaluations', href: '/dashboard/rh/evaluations', icon: Award, permission: 'performance.read', categoryId: 'hr' },

  { name: 'Messagerie Interne', href: '/dashboard/messages', icon: MessageSquare, permission: 'messages.read', categoryId: 'communication' },
  { name: 'Contacts Clients', href: '/dashboard/contacts', icon: PhoneCall, permission: 'customers.read', categoryId: 'communication' },
  { name: 'Campagnes Email', href: '/dashboard/email-campaigns', icon: Mail, permission: 'marketing.read', categoryId: 'communication' },
];

export const employeeProjectShortcuts: SidebarItem[] = [
  { name: 'Planning Projets', href: '/dashboard/calendar', icon: CalendarDays, permission: 'calendar.read' },
  { name: 'Feuilles de Temps', href: '/dashboard/timesheets', icon: Clock, permission: 'time-entries.read' },
];

export const quickAccessItems: SidebarItem[] = [
  { name: 'Tableau de bord', href: '/dashboard', icon: Home, permission: 'dashboard.read' },
  { name: 'Nouveau Devis', href: '/dashboard/quotes?action=create', icon: FileText, permission: 'quotes.create' },
  { name: 'Nouvelle Intervention', href: '/dashboard/technical/interventions?action=create', icon: Wrench, permission: 'interventions.create' },
  { name: 'Saisie Dépense', href: '/dashboard/comptabilite/depenses?action=create', icon: DollarSign, permission: 'expenses.create' },
  { name: 'Commande d\'Achat', href: '/dashboard/achats/commandes?action=create', icon: ShoppingCart, permission: 'purchases.create' },
];

export const adminNavigation: SidebarItem[] = [
  { name: 'Utilisateurs', href: '/dashboard/admin/users', icon: Users, permission: 'admin' },
  { name: 'Rôles', href: '/dashboard/admin/roles-management', icon: Shield, permission: 'admin' },
  { name: 'Services', href: '/dashboard/admin/services', icon: Building2, permission: 'admin' },
  { name: 'Permissions', href: '/dashboard/admin/permissions', icon: ShieldCheck, permission: 'admin' },
  { name: 'Journal d\'audit', href: '/dashboard/admin/audit-logs', icon: BookOpen, permission: 'admin' },
  { name: 'Paramètres', href: '/dashboard/settings', icon: Settings, permission: 'admin' },
];
