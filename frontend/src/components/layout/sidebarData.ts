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
  isServiceDashboard?: boolean;
}

export const sidebarCategories: SidebarCategory[] = [
  { id: 'dashboard', name: 'Tableau de Bord', icon: Home, permission: 'dashboard.read' },
  { id: 'commercial', name: 'Commercial', icon: Target, permission: 'prospects.read' },
  { id: 'crm', name: 'CRM', icon: Users, permission: 'customers.read' },
  { id: 'billing', name: 'Facturation', icon: Receipt, permission: 'invoices.read' },
  { id: 'accounting', name: 'Comptabilité', icon: DollarSign, permission: 'expenses.read' },
  { id: 'technical', name: 'Services Techniques', icon: Wrench, permission: 'missions.read' },
  { id: 'projects', name: 'Gestion de Projets', icon: FolderKanban, permission: 'projects.read' },
  { id: 'procurement', name: 'Achats & Logistique', icon: ShoppingCart, permission: 'purchases.read' },
  { id: 'hr', name: 'Ressources Humaines', icon: UserCheck, permission: 'employees.read' },
  { id: 'communication', name: 'Communication', icon: MessageSquare, permission: 'messages.read' },
];

export const sidebarItems: SidebarItem[] = [
  { name: 'Tableau de bord', href: '/dashboard', icon: Home, permission: 'dashboard.read', categoryId: 'dashboard' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: LineChart, permission: 'reports.read_financial', categoryId: 'dashboard' },
  { name: 'Validation DG Achats', href: '/dashboard/approbations/achats', icon: Workflow, permission: 'purchase_requests.approve', categoryId: 'dashboard' },

  { name: 'Dashboard Commercial', href: '/dashboard/commercial/prospects', icon: Home, permission: 'prospects.read', categoryId: 'commercial', isServiceDashboard: true },
  { name: 'Prospection', href: '/dashboard/commercial/prospects', icon: Target, permission: 'prospects.read', categoryId: 'commercial' },
  { name: 'Pipeline Commercial', href: '/dashboard/commercial/pipeline', icon: Workflow, permission: 'prospects.read', categoryId: 'commercial' },
  { name: 'Devis & Propositions', href: '/dashboard/commercial/quotes', icon: FileText, permission: 'quotes.read', categoryId: 'commercial' },

  { name: 'Dashboard CRM', href: '/dashboard/crm', icon: Home, permission: 'customers.read', categoryId: 'crm', isServiceDashboard: true },
  { name: 'CRM', href: '/dashboard/crm', icon: Users, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Clients', href: '/dashboard/crm/clients', icon: Users, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Types de Clients', href: '/dashboard/crm/type-clients', icon: Users, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Contacts', href: '/dashboard/crm/contacts', icon: PhoneCall, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Adresses', href: '/dashboard/crm/addresses', icon: Building2, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Contacts Clients', href: '/dashboard/crm/contracts', icon: FileCheck, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Campagnes Email', href: '/dashboard/crm/email-campaigns', icon: Mail, permission: 'emails.read', categoryId: 'crm' },
  { name: 'Documents', href: '/dashboard/crm/documents', icon: FileText, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Historique Interactions', href: '/dashboard/crm/interactions', icon: MessageSquare, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Opportunités', href: '/dashboard/crm/opportunities', icon: TrendingUp, permission: 'opportunities.read', categoryId: 'crm' },
  { name: 'Rapports', href: '/dashboard/crm/reports', icon: BarChart, permission: 'reports.read', categoryId: 'crm' },

  { name: 'Dashboard Facturation', href: '/dashboard/facturation', icon: Home, permission: 'invoices.read', categoryId: 'billing', isServiceDashboard: true },
  { name: 'Factures', href: '/dashboard/facturation', icon: Receipt, permission: 'invoices.read', categoryId: 'billing' },
  { name: 'Suivi Paiements', href: '/dashboard/facturation/paiements', icon: CreditCard, permission: 'payments.read', categoryId: 'billing' },
  { name: 'Avoirs & Remboursements', href: '/dashboard/facturation/avoirs', icon: FileText, permission: 'invoices.read', categoryId: 'billing' },

  { name: 'Dashboard Comptable', href: '/dashboard/comptabilite/depenses', icon: Home, permission: 'expenses.read', categoryId: 'accounting', isServiceDashboard: true },
  { name: 'Bons de caisse', href: '/dashboard/comptabilite/depenses', icon: DollarSign, permission: 'expenses.read', categoryId: 'accounting' },
  { name: 'Trésorerie', href: '/dashboard/comptabilite/tresorerie', icon: LineChart, permission: 'payments.read', categoryId: 'accounting' },
  { name: 'Comptes', href: '/dashboard/comptabilite/comptes', icon: BookOpen, permission: 'expenses.read', categoryId: 'accounting' },
  { name: 'Écritures', href: '/dashboard/comptabilite/ecritures', icon: Receipt, permission: 'payments.read', categoryId: 'accounting' },
  { name: 'Rapports comptables', href: '/dashboard/comptabilite/rapports', icon: BarChart, permission: 'reports.read_financial', categoryId: 'accounting' },

  { name: 'Dashboard Technique', href: '/dashboard/technical', icon: Home, permission: 'missions.read', categoryId: 'technical', isServiceDashboard: true },
  { name: 'Analytics Technique', href: '/dashboard/technical/analytics', icon: LineChart, permission: 'missions.read', categoryId: 'technical', isServiceDashboard: true },
  { name: 'Planning Interventions', href: '/dashboard/technical/interventions', icon: Calendar, permission: 'interventions.read', categoryId: 'technical' },
  { name: 'Gestion des Missions', href: '/dashboard/technical/missions', icon: ClipboardList, permission: 'missions.read', categoryId: 'technical' },
  { name: 'Ordres de Mission', href: '/dashboard/technical/ordres-mission', icon: FileCheck, permission: 'mission_orders.read', categoryId: 'technical' },
  { name: 'Équipe Technique', href: '/dashboard/technical/techniciens', icon: UserCheck, permission: 'techniciens.read', categoryId: 'technical' },
  { name: 'Spécialités', href: '/dashboard/technical/specialites', icon: Award, permission: 'specialites.read', categoryId: 'technical' },
  { name: 'Gestion du Matériel', href: '/dashboard/technical/materiel', icon: Package, permission: 'materiel.read', categoryId: 'technical' },
  { name: 'Rapports Intervention', href: '/dashboard/technical/rapports', icon: FileText, permission: 'interventions.create_report', categoryId: 'technical' },

  { name: 'Dashboard Projets', href: '/dashboard/projets', icon: Home, permission: 'projects.read', categoryId: 'projects', isServiceDashboard: true },
  { name: 'Projets', href: '/dashboard/projets', icon: FolderKanban, permission: 'projects.read', categoryId: 'projects' },
  { name: 'Tâches & Planning', href: '/dashboard/projets/taches', icon: ClipboardList, permission: 'tasks.read', categoryId: 'projects' },
  { name: 'Jalons', href: '/dashboard/projets/jalons', icon: Award, permission: 'projects.read', categoryId: 'projects' },
  { name: 'Planning Gantt', href: '/dashboard/projets/planning', icon: CalendarDays, permission: 'projects.read', categoryId: 'projects' },
  { name: 'Feuilles de Temps', href: '/dashboard/timesheets', icon: Clock, permission: 'attendance.read', categoryId: 'projects' },

  { name: 'Dashboard Achats', href: '/dashboard/achats', icon: Home, permission: 'purchases.read', categoryId: 'procurement', isServiceDashboard: true },
  { name: 'Catalogue Produits', href: '/dashboard/achats/produits', icon: Package, permission: 'products.read', categoryId: 'procurement' },
  { name: 'Fournisseurs', href: '/dashboard/achats/fournisseurs', icon: Truck, permission: 'suppliers.read', categoryId: 'procurement' },
  { name: 'DPA & Proformas', href: '/dashboard/achats/devis', icon: FileText, permission: 'purchases.read', categoryId: 'procurement' },
  { name: 'Commandes d\'Achat', href: '/dashboard/achats/commandes', icon: ShoppingCart, permission: 'purchase_orders.read', categoryId: 'procurement' },
  { name: 'Réceptions', href: '/dashboard/achats/receptions', icon: ClipboardList, permission: 'purchase_orders.read', categoryId: 'procurement' },
  { name: 'Gestion des Stocks', href: '/dashboard/achats/stock', icon: Warehouse, permission: 'inventory.read', categoryId: 'procurement' },
  { name: 'Audit Stock', href: '/dashboard/achats/audit', icon: GitBranch, permission: 'inventory.count', categoryId: 'procurement' },

  { name: 'Dashboard RH', href: '/dashboard/rh', icon: Home, permission: 'employees.read', categoryId: 'hr', isServiceDashboard: true },
  { name: 'Effectifs', href: '/dashboard/rh/employes', icon: Users, permission: 'employees.read', categoryId: 'hr' },
  { name: 'Contrats', href: '/dashboard/rh/contrats', icon: FileText, permission: 'contracts.read', categoryId: 'hr' },
  { name: 'Paie & Salaires', href: '/dashboard/rh/paie', icon: DollarSign, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'Gestion des Congés', href: '/dashboard/rh/conges', icon: Calendar, permission: 'leaves.read', categoryId: 'hr' },
  { name: 'Avances & Prêts', href: '/dashboard/rh/prets', icon: CreditCard, permission: 'loans.read', categoryId: 'hr' },
  { name: 'Évaluations', href: '/dashboard/rh/evaluations', icon: Award, permission: 'evaluations.read', categoryId: 'hr' },

  { name: 'Dashboard Communication', href: '/dashboard/messages', icon: Home, permission: 'messages.read', categoryId: 'communication', isServiceDashboard: true },
  { name: 'Messagerie Interne', href: '/dashboard/messages', icon: MessageSquare, permission: 'messages.read', categoryId: 'communication' },
];

export const employeeProjectShortcuts: SidebarItem[] = [
  { name: 'Planning Projets', href: '/dashboard/calendar', icon: CalendarDays, permission: 'projects.read' },
  { name: 'Feuilles de Temps', href: '/dashboard/timesheets', icon: Clock, permission: 'attendance.read' },
];

export const quickAccessItems: SidebarItem[] = [
  { name: 'Tableau de bord', href: '/dashboard', icon: Home, permission: 'dashboard.read' },
  { name: 'Nouveau Devis', href: '/dashboard/quotes?action=create', icon: FileText, permission: 'quotes.create' },
  { name: 'Nouvelle Intervention', href: '/dashboard/technical/interventions?action=create', icon: Wrench, permission: 'interventions.create' },
  { name: 'Bon de caisse', href: '/dashboard/comptabilite/depenses?action=create', icon: DollarSign, permission: 'expenses.create' },
  { name: 'Commande Achat', href: '/dashboard/achats/commandes?action=create', icon: ShoppingCart, permission: 'purchase_orders.create' },
];

export const adminNavigation: SidebarItem[] = [
  { name: 'Utilisateurs', href: '/dashboard/admin/users', icon: Users, permission: 'admin' },
  { name: 'Rôles', href: '/dashboard/admin/roles-management', icon: Shield, permission: 'admin' },
  { name: 'Services', href: '/dashboard/admin/services', icon: Building2, permission: 'admin' },
  { name: 'Permissions', href: '/dashboard/admin/permissions', icon: ShieldCheck, permission: 'admin' },
  { name: 'Journal audit', href: '/dashboard/admin/audit-logs', icon: BookOpen, permission: 'admin' },
  { name: 'Paramètres', href: '/dashboard/settings', icon: Settings, permission: 'admin' },
];
