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
  MapPin,
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
  { id: 'projects', name: 'Gestion de Projets', icon: FolderKanban, permission: 'projects.read' },
  { id: 'crm', name: 'CRM', icon: Users, permission: 'customers.read' },
  { id: 'billing', name: 'Facturation', icon: Receipt, permission: 'invoices.read' },
  { id: 'accounting', name: 'Comptabilité', icon: DollarSign, permission: 'expenses.read' },
  { id: 'technical', name: 'Services Techniques', icon: Wrench, permission: 'missions.read' },
  { id: 'procurement', name: 'Achats & Logistique', icon: ShoppingCart, permission: 'purchases.read' },
  { id: 'hr', name: 'Ressources Humaines', icon: UserCheck, permission: 'employees.read' },
  { id: 'communication', name: 'Communication', icon: MessageSquare, permission: 'messages.read' },
];

export const sidebarItems: SidebarItem[] = [
  { name: 'Tableau de bord', href: '/dashboard', icon: Home, permission: 'dashboard.read', categoryId: 'dashboard' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: LineChart, permission: 'reports.read_financial', categoryId: 'dashboard' },
  { name: 'Validation PDG Achats', href: '/dashboard/approbations/achats', icon: Workflow, permission: 'purchase_requests.approve', categoryId: 'dashboard' },

  { name: 'Dashboard Commercial', href: '/dashboard/commercial', icon: Home, permission: 'prospects.read', categoryId: 'commercial', isServiceDashboard: true },
  { name: 'Prospection', href: '/dashboard/commercial/prospects', icon: Target, permission: 'prospects.read', categoryId: 'commercial' },
  { name: 'Prospection terrain', href: '/dashboard/commercial/prospection-terrain', icon: MapPin, permission: 'prospects.read', categoryId: 'commercial' },
  { name: 'Campagnes Email', href: '/dashboard/commercial/email-campaigns', icon: Mail, permission: 'emails.read', categoryId: 'commercial' },
  { name: 'Pipeline Commercial', href: '/dashboard/commercial/pipeline', icon: Workflow, permission: 'prospects.read', categoryId: 'commercial' },
  { name: 'Devis & Propositions', href: '/dashboard/commercial/quotes', icon: FileText, permission: 'quotes.read', categoryId: 'commercial' },

  { name: 'Dashboard Projets', href: '/dashboard/projets', icon: Home, permission: 'projects.read', categoryId: 'projects', isServiceDashboard: true },
  { name: 'Projets', href: '/dashboard/projets/liste', icon: FolderKanban, permission: 'projects.read', categoryId: 'projects' },
  { name: 'Tâches & Planning', href: '/dashboard/projets/taches', icon: ClipboardList, permission: 'tasks.read', categoryId: 'projects' },
  { name: 'Jalons', href: '/dashboard/projets/jalons', icon: Award, permission: 'projects.read', categoryId: 'projects' },
  { name: 'Planning Gantt', href: '/dashboard/projets/planning', icon: CalendarDays, permission: 'projects.read', categoryId: 'projects' },
  { name: 'Feuilles de Temps', href: '/dashboard/timesheets', icon: Clock, permission: 'attendance.read', categoryId: 'projects' },

  { name: 'Dashboard CRM', href: '/dashboard/crm', icon: Home, permission: 'customers.read', categoryId: 'crm', isServiceDashboard: true },
  { name: 'Clients', href: '/dashboard/crm/clients', icon: Users, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Types de Clients', href: '/dashboard/crm/type-clients', icon: Users, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Contacts', href: '/dashboard/crm/contacts', icon: PhoneCall, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Adresses', href: '/dashboard/crm/addresses', icon: Building2, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Contacts Clients', href: '/dashboard/crm/contracts', icon: FileCheck, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Documents', href: '/dashboard/crm/documents', icon: FileText, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Historique Interactions', href: '/dashboard/crm/interactions', icon: MessageSquare, permission: 'customers.read', categoryId: 'crm' },
  { name: 'Opportunités', href: '/dashboard/crm/opportunities', icon: TrendingUp, permission: 'opportunities.read', categoryId: 'crm' },
  { name: 'Rapports', href: '/dashboard/crm/reports', icon: BarChart, permission: 'reports.read', categoryId: 'crm' },

  { name: 'Dashboard Facturation', href: '/dashboard/facturation', icon: Home, permission: 'invoices.read', categoryId: 'billing', isServiceDashboard: true },
  { name: 'Factures', href: '/dashboard/facturation/factures', icon: Receipt, permission: 'invoices.read', categoryId: 'billing' },
  { name: 'Suivi Paiements', href: '/dashboard/facturation/paiements', icon: CreditCard, permission: 'invoices.read', categoryId: 'billing' },
  { name: 'Avoirs & notes de crédit', href: '/dashboard/facturation/avoirs', icon: FileText, permission: 'invoices.read', categoryId: 'billing' },

  { name: 'Dashboard Comptable', href: '/dashboard/comptabilite', icon: Home, permission: 'expenses.read', categoryId: 'accounting', isServiceDashboard: true },
  { name: 'Bons de caisse', href: '/dashboard/comptabilite/depenses', icon: DollarSign, permission: 'expenses.read', categoryId: 'accounting' },
  { name: 'Placements', href: '/dashboard/comptabilite/placements', icon: LineChart, permission: 'reports.read_financial', categoryId: 'accounting' },
  { name: 'Budget', href: '/dashboard/comptabilite/budget', icon: BarChart, permission: 'reports.read_financial', categoryId: 'accounting' },
  { name: 'Trésorerie', href: '/dashboard/comptabilite/tresorerie', icon: LineChart, permission: 'expenses.read', categoryId: 'accounting' },
  { name: 'Comptes', href: '/dashboard/comptabilite/comptes', icon: BookOpen, permission: 'expenses.read', categoryId: 'accounting' },
  { name: 'Écritures', href: '/dashboard/comptabilite/ecritures', icon: Receipt, permission: 'expenses.read', categoryId: 'accounting' },
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

  { name: 'Dashboard Achats', href: '/dashboard/achats', icon: Home, permission: 'purchases.read', categoryId: 'procurement', isServiceDashboard: true },
  { name: 'Catalogue Produits', href: '/dashboard/achats/produits', icon: Package, permission: 'products.read', categoryId: 'procurement' },
  { name: 'Fournisseurs', href: '/dashboard/achats/fournisseurs', icon: Truck, permission: 'suppliers.read', categoryId: 'procurement' },
  { name: 'Devis internes', href: '/dashboard/achats/devis', icon: FileText, permission: 'purchases.read', categoryId: 'procurement' },
  { name: 'Proformas fournisseurs', href: '/dashboard/achats/proformas', icon: FileCheck, permission: 'purchase_orders.read', categoryId: 'procurement' },
  { name: 'Commandes d\'Achat', href: '/dashboard/achats/commandes', icon: ShoppingCart, permission: 'purchase_orders.read', categoryId: 'procurement' },
  { name: 'Réceptions', href: '/dashboard/achats/receptions', icon: ClipboardList, permission: 'purchase_orders.read', categoryId: 'procurement' },
  { name: 'Gestion des Stocks', href: '/dashboard/achats/stock', icon: Warehouse, permission: 'inventory.read', categoryId: 'procurement' },
  { name: 'Audit Stock', href: '/dashboard/achats/audit', icon: GitBranch, permission: 'inventory.count', categoryId: 'procurement' },

  { name: 'Dashboard RH', href: '/dashboard/rh', icon: Home, permission: 'employees.read', categoryId: 'hr', isServiceDashboard: true },
  { name: 'RH - Accueil', href: '/dashboard/rh/accueil', icon: Home, permission: 'employees.read', categoryId: 'hr' },
  { name: 'RH - Mode emploi', href: '/dashboard/rh/mode-emploi', icon: FileText, permission: 'employees.read', categoryId: 'hr' },
  { name: 'RH - Paramètres', href: '/dashboard/rh/parametres', icon: Settings, permission: 'employees.read', categoryId: 'hr' },
  { name: 'RH - Cumuls', href: '/dashboard/rh/cumuls', icon: BarChart, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - LOGIPAIE (Excel)', href: '/dashboard/rh/logipaie', icon: FileCheck, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Personnel (liste)', href: '/dashboard/rh/personnel/liste', icon: Users, permission: 'employees.read', categoryId: 'hr' },
  { name: 'RH - Fiche individuelle', href: '/dashboard/rh/personnel/fiche-individuelle', icon: FileText, permission: 'employees.read', categoryId: 'hr' },
  { name: 'RH - Contrat CDI', href: '/dashboard/rh/personnel/contrat-cdi', icon: FileText, permission: 'contracts.read', categoryId: 'hr' },
  { name: 'RH - Contrat CDD', href: '/dashboard/rh/personnel/contrat-cdd', icon: FileText, permission: 'contracts.read', categoryId: 'hr' },
  { name: 'RH - Attestation travail', href: '/dashboard/rh/personnel/attestation-travail', icon: FileText, permission: 'employees.read', categoryId: 'hr' },
  { name: 'RH - Certificat travail', href: '/dashboard/rh/personnel/certificat-travail', icon: FileText, permission: 'employees.read', categoryId: 'hr' },
  { name: 'RH - Congés (gestion)', href: '/dashboard/rh/personnel/conges/gestion', icon: Calendar, permission: 'leaves.read', categoryId: 'hr' },
  { name: 'RH - Congés (attestation)', href: '/dashboard/rh/personnel/conges/attestation', icon: Calendar, permission: 'leaves.read', categoryId: 'hr' },
  { name: 'RH - Heures sup.', href: '/dashboard/rh/personnel/heures-supplementaires', icon: Clock, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Gratifications', href: '/dashboard/rh/personnel/gratifications', icon: Award, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Rupture contrat', href: '/dashboard/rh/personnel/rupture-contrat', icon: FileCheck, permission: 'contracts.read', categoryId: 'hr' },
  { name: 'RH - Prêts', href: '/dashboard/rh/personnel/prets', icon: CreditCard, permission: 'loans.read', categoryId: 'hr' },
  { name: 'RH - Paie (traitement)', href: '/dashboard/rh/paie/traitement', icon: DollarSign, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Bulletins', href: '/dashboard/rh/paie/bulletins', icon: Receipt, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Bulletins groupés', href: '/dashboard/rh/paie/bulletins-groupes', icon: Receipt, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Livre de paie mensuel', href: '/dashboard/rh/paie/livre-paie-mensuel', icon: BookOpen, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Livre de paie annuel', href: '/dashboard/rh/paie/livre-paie-annuel', icon: BookOpen, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Déclaration ITS', href: '/dashboard/rh/declarations/its', icon: FileText, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Déclaration FDFP', href: '/dashboard/rh/declarations/fdfp', icon: FileText, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - CNPS (liste)', href: '/dashboard/rh/declarations/cnps/liste-nominative', icon: FileText, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - CNPS (déclaration)', href: '/dashboard/rh/declarations/cnps/declaration', icon: FileText, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - DISA', href: '/dashboard/rh/declarations/disa', icon: FileText, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - DASC', href: '/dashboard/rh/declarations/dasc', icon: FileText, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Etat 301 P1', href: '/dashboard/rh/declarations/etat-301/page-1', icon: FileText, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Etat 301 P2', href: '/dashboard/rh/declarations/etat-301/page-2', icon: FileText, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Données RNS', href: '/dashboard/rh/rns/donnees', icon: FileText, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Relevé RNS', href: '/dashboard/rh/rns/releve', icon: FileText, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Ordre de virement', href: '/dashboard/rh/banque/ordre-virement', icon: FileCheck, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Liste virements', href: '/dashboard/rh/banque/liste-virements', icon: FileCheck, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Imputations', href: '/dashboard/rh/comptabilite/imputations', icon: Receipt, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Masse salariale', href: '/dashboard/rh/comptabilite/masse-salariale', icon: BarChart, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Provision congés', href: '/dashboard/rh/provisions/conges', icon: Calendar, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Provision retraite', href: '/dashboard/rh/provisions/retraite', icon: Calendar, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Note 27B', href: '/dashboard/rh/note-27b', icon: FileText, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Régulation FDFP', href: '/dashboard/rh/regul-annuelle-fdfp', icon: FileCheck, permission: 'payroll.read', categoryId: 'hr' },
  { name: 'RH - Journal personnel', href: '/dashboard/rh/journal-personnel', icon: ClipboardList, permission: 'employees.read', categoryId: 'hr' },
  { name: 'RH - Indicateurs RH', href: '/dashboard/rh/indicateurs-rh', icon: BarChart, permission: 'payroll.read', categoryId: 'hr' },
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
  { name: 'Nouveau Devis', href: '/dashboard/commercial/quotes', icon: FileText, permission: 'quotes.create' },
  { name: 'Nouvelle Intervention', href: '/dashboard/technical/interventions?action=create', icon: Wrench, permission: 'interventions.create' },
  { name: 'Bon de caisse', href: '/dashboard/comptabilite/depenses?action=create', icon: DollarSign, permission: 'expenses.create' },
  { name: 'Commande Achat', href: '/dashboard/achats/commandes?action=create', icon: ShoppingCart, permission: 'purchase_orders.create' },
];

export const adminNavigation: SidebarItem[] = [
  { name: 'Entreprises', href: '/dashboard/admin/enterprises', icon: Building2, permission: 'enterprises.read' },
  { name: 'Utilisateurs', href: '/dashboard/admin/users', icon: Users, permission: 'admin' },
  { name: 'Rôles', href: '/dashboard/admin/roles-management', icon: Shield, permission: 'admin' },
  { name: 'Services', href: '/dashboard/admin/services', icon: Building2, permission: 'admin' },
  { name: 'Permissions', href: '/dashboard/admin/permissions', icon: ShieldCheck, permission: 'admin' },
  { name: 'Journal audit', href: '/dashboard/admin/audit-logs', icon: BookOpen, permission: 'admin' },
  { name: 'Paramètres', href: '/dashboard/settings', icon: Settings, permission: 'admin' },
];
