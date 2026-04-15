import type { Permission } from '@/shared/api/admin/admin.service';

export interface PermissionSubgroup {
  id: string;
  label: string;
  permissions: Permission[];
}

export interface PermissionServiceGroup {
  id: string;
  label: string;
  description?: string;
  order: number;
  permissions: Permission[];
  subgroups: PermissionSubgroup[];
  dashboards: Array<{ label: string; href: string; permissions?: string[] }>;
}

interface ServiceDefinition {
  id: string;
  label: string;
  description: string;
  order: number;
  categories: string[];
  prefixes: string[];
  subgroupLabels: Record<string, string>;
  dashboards: Array<{ label: string; href: string; permissions?: string[] }>;
}

export const serviceDefinitions: ServiceDefinition[] = [
  {
    id: 'dashboard',
    label: 'Tableau de Bord',
    description: 'Accès au cockpit global, widgets et indicateurs transverses.',
    order: 10,
    categories: ['dashboard', 'analytics'],
    prefixes: ['dashboard', 'analytics', 'widgets', 'reports'],
    subgroupLabels: {
      dashboard: 'Tableau de bord',
      analytics: 'Analytics',
      widgets: 'Widgets',
      reports: 'Rapports',
    },
    dashboards: [
      { label: 'Dashboard global', href: '/dashboard', permissions: ['dashboard.read'] },
      { label: 'Analytics global', href: '/dashboard/analytics', permissions: ['dashboard.read_analytics', 'reports.read_financial'] },
    ],
  },
  {
    id: 'commercial',
    label: 'Commercial',
    description: 'Prospection, pipeline et propositions commerciales.',
    order: 20,
    categories: ['commercial', 'prospects', 'quotes'],
    prefixes: ['prospects', 'quotes'],
    subgroupLabels: {
      prospects: 'Prospection',
      quotes: 'Devis & propositions',
    },
    dashboards: [{ label: 'Dashboard commercial', href: '/dashboard/commercial/prospects' }],
  },
  {
    id: 'crm',
    label: 'CRM',
    description: 'Clients, contacts, contrats, interactions et opportunités.',
    order: 30,
    categories: ['crm', 'customers', 'contacts', 'opportunities', 'contracts', 'documents', 'emails', 'interactions'],
    prefixes: ['customers', 'contacts', 'opportunities', 'contracts', 'documents', 'emails', 'interactions'],
    subgroupLabels: {
      customers: 'Clients',
      contacts: 'Contacts',
      opportunities: 'Opportunites',
      contracts: 'Contrats',
      documents: 'Documents',
      emails: 'Campagnes email',
      interactions: 'Interactions',
    },
    dashboards: [
      { label: 'Dashboard CRM', href: '/dashboard/crm' },
      { label: 'Clients', href: '/dashboard/crm/clients' },
      { label: 'Contacts', href: '/dashboard/crm/contacts' },
      { label: 'Adresses', href: '/dashboard/crm/addresses' },
      { label: 'Interactions', href: '/dashboard/crm/interactions' },
    ],
  },
  {
    id: 'billing',
    label: 'Facturation Clients',
    description: 'Devis commerciaux, factures clients et suivi des encaissements.',
    order: 40,
    categories: ['billing', 'invoices'],
    prefixes: ['invoices'],
    subgroupLabels: {
      invoices: 'Factures',
    },
    dashboards: [{ label: 'Dashboard facturation', href: '/dashboard/facturation' }],
  },
  {
    id: 'accounting',
    label: 'Comptabilité & Caisse',
    description: 'Bons de caisse, paiements, écritures et vision consolidée des dépenses.',
    order: 50,
    categories: ['expenses', 'payments', 'reports'],
    prefixes: ['expenses', 'payments'],
    subgroupLabels: {
      expenses: 'Depenses',
      payments: 'Paiements & décaissements',
      reports: 'Rapports financiers',
    },
    dashboards: [
      { label: 'Bons de caisse', href: '/dashboard/comptabilite/depenses' },
      { label: 'Trésorerie', href: '/dashboard/comptabilite/tresorerie' },
      { label: 'Comptes', href: '/dashboard/comptabilite/comptes' },
      { label: 'Rapports comptables', href: '/dashboard/comptabilite/rapports' },
    ],
  },
  {
    id: 'technical',
    label: 'Services Techniques',
    description: 'Organisation des équipes terrain, missions, interventions et matériel.',
    order: 60,
    categories: ['technical', 'missions', 'mission_orders', 'interventions', 'techniciens', 'specialites', 'materiel', 'rapports_techniques'],
    prefixes: ['missions', 'mission_orders', 'interventions', 'techniciens', 'specialites', 'materiel', 'rapports_techniques'],
    subgroupLabels: {
      missions: 'Missions',
      mission_orders: 'Ordres de mission',
      interventions: 'Interventions',
      techniciens: 'Techniciens',
      specialites: 'Specialites',
      materiel: 'Materiel',
      rapports_techniques: 'Rapports techniques',
      reports: 'Rapports techniques',
    },
    dashboards: [
      { label: 'Dashboard technique', href: '/dashboard/technical' },
      { label: 'Analytics technique', href: '/dashboard/technical/analytics' },
      { label: 'Gestion des missions', href: '/dashboard/technical/missions' },
      { label: 'Planning interventions', href: '/dashboard/technical/interventions' },
      { label: 'Ordres de mission', href: '/dashboard/technical/ordres-mission' },
    ],
  },
  {
    id: 'projects',
    label: 'Gestion de Projets',
    description: 'Pilotage des projets, tâches, planning et suivi du temps.',
    order: 70,
    categories: ['projects', 'tasks', 'attendance'],
    prefixes: ['projects', 'tasks', 'attendance'],
    subgroupLabels: {
      projects: 'Projets',
      tasks: 'Taches',
      attendance: 'Temps & presence',
    },
    dashboards: [{ label: 'Dashboard projets', href: '/dashboard/projets' }],
  },
  {
    id: 'procurement',
    label: 'Achats & Logistique',
    description: 'Demandes internes d’achat, validation DG, chiffrage achat, commandes et stock.',
    order: 80,
    categories: ['procurement', 'purchases', 'products', 'suppliers', 'purchase_orders', 'purchase_requests', 'inventory'],
    prefixes: ['purchases', 'products', 'suppliers', 'purchase_orders', 'purchase_requests', 'inventory'],
    subgroupLabels: {
      purchases: 'Demandes d achat internes',
      products: 'Produits',
      suppliers: 'Fournisseurs',
      purchase_requests: 'Devis internes, commission achat et validation DG',
      purchase_orders: 'Commandes d\'achat & réceptions',
      inventory: 'Stocks',
    },
    dashboards: [
      { label: 'Dashboard achats', href: '/dashboard/achats', permissions: ['purchases.read'] },
      { label: 'Devis internes', href: '/dashboard/achats/devis', permissions: ['purchases.read'] },
      { label: 'Proformas fournisseurs', href: '/dashboard/achats/proformas', permissions: ['purchase_orders.read'] },
      { label: 'Catalogue produits', href: '/dashboard/achats/produits', permissions: ['products.read'] },
      { label: 'Fournisseurs', href: '/dashboard/achats/fournisseurs', permissions: ['suppliers.read'] },
      { label: 'Commandes d\'achat', href: '/dashboard/achats/commandes', permissions: ['purchase_orders.read'] },
      { label: 'Receptions', href: '/dashboard/achats/receptions', permissions: ['purchase_orders.read'] },
      { label: 'Gestion des stocks', href: '/dashboard/achats/stock', permissions: ['inventory.read'] },
      { label: 'Audit stock', href: '/dashboard/achats/audit', permissions: ['inventory.count'] },
    ],
  },
  {
    id: 'hr',
    label: 'Ressources Humaines',
    description: 'Effectifs, contrats, congés, paie et évaluations.',
    order: 90,
    categories: ['hr', 'employees', 'employee_contracts', 'contracts', 'leaves', 'loans', 'evaluations', 'payroll'],
    prefixes: ['employees', 'employee_contracts', 'contracts', 'leaves', 'loans', 'evaluations', 'payroll'],
    subgroupLabels: {
      employees: 'Employes',
      employee_contracts: 'Contrats employe',
      contracts: 'Contrats',
      leaves: 'Conges',
      loans: 'Avances & prets',
      evaluations: 'Evaluations',
      payroll: 'Paie',
    },
    dashboards: [{ label: 'Dashboard RH', href: '/dashboard/rh' }],
  },
  {
    id: 'communication',
    label: 'Communication',
    description: 'Messagerie interne, notifications et communication sortante.',
    order: 100,
    categories: ['communication', 'messages', 'notifications', 'emails'],
    prefixes: ['messages', 'notifications', 'emails'],
    subgroupLabels: {
      messages: 'Messagerie',
      notifications: 'Notifications',
      emails: 'Emails',
    },
    dashboards: [{ label: 'Dashboard communication', href: '/dashboard/messages' }],
  },
  {
    id: 'admin',
    label: 'Administration',
    description: 'Configuration des utilisateurs, rôles, services, permissions et audit.',
    order: 110,
    categories: ['users', 'roles', 'permissions', 'services', 'audit_logs', 'auditlog', 'backups', 'settings', 'logs', 'integrations'],
    prefixes: ['users', 'roles', 'permissions', 'services', 'audit_logs', 'backups', 'settings', 'logs', 'integrations'],
    subgroupLabels: {
      users: 'Utilisateurs',
      roles: 'Roles',
      permissions: 'Permissions',
      services: 'Services',
      audit_logs: 'Journal d\'audit',
      backups: 'Sauvegardes',
      settings: 'Parametres',
      logs: 'Logs',
      integrations: 'Integrations',
    },
    dashboards: [
      { label: 'Utilisateurs', href: '/dashboard/admin/users' },
      { label: 'Permissions', href: '/dashboard/admin/permissions' },
    ],
  },
];

export const findServiceDefinition = (permission: Permission): ServiceDefinition => {
  const category = String(permission.category || '').toLowerCase();
  const prefix = String(permission.name || '').toLowerCase().split('.')[0];

  const directMatch = serviceDefinitions.find(
    (service) => service.prefixes.includes(prefix) || service.categories.includes(category),
  );

  if (directMatch) {
    if (prefix === 'reports') {
      if (permission.name.includes('financial')) return serviceDefinitions.find((s) => s.id === 'accounting') || directMatch;
      if (permission.name.includes('technical')) return serviceDefinitions.find((s) => s.id === 'technical') || directMatch;
      if (permission.name.includes('hr')) return serviceDefinitions.find((s) => s.id === 'hr') || directMatch;
      if (permission.name.includes('sales')) return serviceDefinitions.find((s) => s.id === 'commercial') || directMatch;
      if (permission.name.includes('operations')) return serviceDefinitions.find((s) => s.id === 'projects') || directMatch;
    }
    return directMatch;
  }

  return {
    id: 'other',
    label: 'Autres permissions',
    description: 'Permissions non encore rattachées à un module métier identifié.',
    order: 999,
    categories: [],
    prefixes: [],
    subgroupLabels: {},
    dashboards: [],
  };
};

export const getSubgroupId = (permission: Permission): string => {
  const prefix = String(permission.name || '').toLowerCase().split('.')[0];
  if (prefix === 'reports') {
    if (permission.name.includes('financial')) return 'reports_financial';
    if (permission.name.includes('technical')) return 'reports_technical';
    if (permission.name.includes('hr')) return 'reports_hr';
    if (permission.name.includes('sales')) return 'reports_sales';
    return 'reports';
  }
  return prefix || 'other';
};

export const getSubgroupLabel = (service: ServiceDefinition, subgroupId: string): string => {
  if (subgroupId === 'reports_financial') return 'Rapports financiers';
  if (subgroupId === 'reports_technical') return 'Analyses techniques';
  if (subgroupId === 'reports_hr') return 'Rapports RH';
  if (subgroupId === 'reports_sales') return 'Rapports commerciaux';
  if (subgroupId === 'reports') return 'Rapports';
  return service.subgroupLabels[subgroupId] || subgroupId.replace(/_/g, ' ');
};

export const groupPermissionsByService = (permissions: Permission[]): PermissionServiceGroup[] => {
  const groups = new Map<string, PermissionServiceGroup>();

  permissions.forEach((permission) => {
    const service = findServiceDefinition(permission);
    const subgroupId = getSubgroupId(permission);

    if (!groups.has(service.id)) {
      groups.set(service.id, {
        id: service.id,
        label: service.label,
        description: service.description,
        order: service.order,
        permissions: [],
        subgroups: [],
        dashboards: service.dashboards,
      });
    }

    const group = groups.get(service.id)!;
    group.permissions.push(permission);

    let subgroup = group.subgroups.find((item) => item.id === subgroupId);
    if (!subgroup) {
      subgroup = {
        id: subgroupId,
        label: getSubgroupLabel(service, subgroupId),
        permissions: [],
      };
      group.subgroups.push(subgroup);
    }

    subgroup.permissions.push(permission);
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      permissions: [...group.permissions].sort((a, b) => a.name.localeCompare(b.name)),
      subgroups: group.subgroups
        .map((subgroup) => ({
          ...subgroup,
          permissions: [...subgroup.permissions].sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
};
