import type { Permission, PermissionModule } from '@/shared/api/admin/admin.service';

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

const dashboardLinksByService: Record<string, ServiceDefinition['dashboards']> = {
  dashboard: [
    { label: 'Dashboard global', href: '/dashboard', permissions: ['dashboard.read'] },
    { label: 'Analytics global', href: '/dashboard/analytics', permissions: ['dashboard.read_analytics', 'reports.read_financial'] },
  ],
  commercial: [{ label: 'Dashboard commercial', href: '/dashboard/commercial/prospects' }],
  projects: [{ label: 'Dashboard projets', href: '/dashboard/projets' }],
  crm: [
    { label: 'Dashboard CRM', href: '/dashboard/crm' },
    { label: 'Clients', href: '/dashboard/crm/clients' },
    { label: 'Contacts', href: '/dashboard/crm/contacts' },
    { label: 'Adresses', href: '/dashboard/crm/addresses' },
    { label: 'Interactions', href: '/dashboard/crm/interactions' },
  ],
  billing: [
    { label: 'Dashboard facturation', href: '/dashboard/facturation', permissions: ['billing.dashboard.read'] },
    { label: 'Devis', href: '/dashboard/facturation/devis', permissions: ['quotes.read', 'quotes.read_all', 'quotes.read_own'] },
    { label: 'Factures', href: '/dashboard/facturation/factures', permissions: ['invoices.read', 'invoices.read_all', 'invoices.read_own'] },
    { label: 'Suivi paiements', href: '/dashboard/facturation/paiements', permissions: ['payments.read', 'payments.read_all', 'payments.read_own'] },
    { label: 'Avoirs & notes de credit', href: '/dashboard/facturation/avoirs', permissions: ['credit_notes.read', 'invoices.credit_note'] },
  ],
  accounting: [
    { label: 'Bons de caisse', href: '/dashboard/comptabilite/depenses' },
    { label: 'Trésorerie', href: '/dashboard/comptabilite/tresorerie' },
    { label: 'Comptes', href: '/dashboard/comptabilite/comptes' },
    { label: 'Rapports comptables', href: '/dashboard/comptabilite/rapports' },
  ],
  technical: [
    { label: 'Dashboard technique', href: '/dashboard/technical' },
    { label: 'Analytics technique', href: '/dashboard/technical/analytics' },
    { label: 'Gestion des missions', href: '/dashboard/technical/missions' },
    { label: 'Planning interventions', href: '/dashboard/technical/interventions' },
    { label: 'Ordres de mission', href: '/dashboard/technical/ordres-mission' },
  ],
  procurement: [
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
  hr: [{ label: 'Dashboard RH', href: '/dashboard/rh' }],
  communication: [{ label: 'Dashboard communication', href: '/dashboard/messages' }],
  administration: [
    { label: 'Utilisateurs', href: '/dashboard/admin/users' },
    { label: 'Permissions', href: '/dashboard/admin/permissions' },
  ],
};

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
    description: 'Prospection et opportunités commerciales.',
    order: 20,
    categories: ['prospects', 'opportunities'],
    prefixes: ['prospects', 'opportunities'],
    subgroupLabels: {
      prospects: 'Prospection',
      opportunities: 'Opportunites',
    },
    dashboards: [{ label: 'Dashboard commercial', href: '/dashboard/commercial/prospects' }],
  },
  {
    id: 'projects',
    label: 'Gestion de Projets',
    description: 'Pilotage des projets, tâches, planning et suivi du temps.',
    order: 30,
    categories: ['projects', 'tasks'],
    prefixes: ['projects', 'tasks'],
    subgroupLabels: {
      projects: 'Projets',
      tasks: 'Taches',
    },
    dashboards: [{ label: 'Dashboard projets', href: '/dashboard/projets' }],
  },
  {
    id: 'crm',
    label: 'CRM',
    description: 'Clients, contacts, contrats et interactions.',
    order: 40,
    categories: ['customers', 'contacts', 'interactions', 'contracts'],
    prefixes: ['customers', 'contacts', 'interactions', 'contracts'],
    subgroupLabels: {
      customers: 'Clients',
      contacts: 'Contacts',
      contracts: 'Contrats',
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
    label: 'Facturation',
    description: 'Devis, factures clients, avoirs et suivi des encaissements.',
    order: 50,
    categories: ['quotes', 'invoices', 'payments', 'credit_notes'],
    prefixes: ['billing', 'quotes', 'invoices', 'payments', 'credit_notes'],
    subgroupLabels: {
      billing: 'Dashboard facturation',
      quotes: 'Devis',
      invoices: 'Factures',
      payments: 'Paiements clients',
      credit_notes: 'Avoirs & notes de credit',
    },
    dashboards: [
      { label: 'Dashboard facturation', href: '/dashboard/facturation', permissions: ['billing.dashboard.read'] },
      { label: 'Devis', href: '/dashboard/facturation/devis', permissions: ['quotes.read', 'quotes.read_all', 'quotes.read_own'] },
      { label: 'Factures', href: '/dashboard/facturation/factures', permissions: ['invoices.read', 'invoices.read_all', 'invoices.read_own'] },
      { label: 'Suivi paiements', href: '/dashboard/facturation/paiements', permissions: ['payments.read', 'payments.read_all', 'payments.read_own'] },
      { label: 'Avoirs & notes de credit', href: '/dashboard/facturation/avoirs', permissions: ['credit_notes.read', 'invoices.credit_note'] },
    ],
  },
  {
    id: 'accounting',
    label: 'Comptabilité & Caisse',
    description: 'Bons de caisse, paiements, écritures et vision consolidée des dépenses.',
    order: 60,
    categories: ['accounting', 'expenses'],
    prefixes: ['expenses', 'accounting'],
    subgroupLabels: {
      expenses: 'Depenses',
      accounting: 'Comptabilite',
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
    order: 70,
    categories: ['missions', 'mission_orders', 'interventions', 'techniciens', 'specialites', 'materiel', 'rapports_techniques'],
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
    id: 'procurement',
    label: 'Achats & Logistique',
    description: 'Demandes internes d’achat, validation PDG, chiffrage achat, commandes et stock.',
    order: 80,
    categories: ['purchases', 'products', 'suppliers', 'purchase_orders', 'purchase_requests', 'inventory', 'warehouses', 'stock_movements'],
    prefixes: ['purchases', 'products', 'suppliers', 'purchase_orders', 'purchase_requests', 'inventory', 'warehouses', 'stock_movements'],
    subgroupLabels: {
      purchases: 'Demandes d achat internes',
      products: 'Produits',
      suppliers: 'Fournisseurs',
      purchase_requests: 'Devis internes, commission achat et validation PDG',
      purchase_orders: 'Commandes d\'achat & réceptions',
      inventory: 'Stocks',
      warehouses: 'Entrepots',
      stock_movements: 'Mouvements de stock',
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
    categories: ['employees', 'employee_contracts', 'payroll', 'leaves', 'attendance', 'evaluations', 'loans'],
    prefixes: ['employees', 'employee_contracts', 'payroll', 'leaves', 'attendance', 'evaluations', 'loans'],
    subgroupLabels: {
      employees: 'Employes',
      employee_contracts: 'Contrats employe',
      payroll: 'Paie',
      leaves: 'Conges',
      attendance: 'Presences',
      evaluations: 'Evaluations',
      loans: 'Avances & prets',
    },
    dashboards: [{ label: 'Dashboard RH', href: '/dashboard/rh' }],
  },
  {
    id: 'communication',
    label: 'Communication',
    description: 'Messagerie interne, notifications et communication sortante.',
    order: 100,
    categories: ['messages', 'notifications', 'emails', 'documents'],
    prefixes: ['messages', 'notifications', 'emails', 'documents'],
    subgroupLabels: {
      messages: 'Messagerie',
      notifications: 'Notifications',
      emails: 'Emails',
      documents: 'Documents',
    },
    dashboards: [{ label: 'Dashboard communication', href: '/dashboard/messages' }],
  },
  {
    id: 'administration',
    label: 'Administration',
    description: 'Configuration des utilisateurs, rôles, services, permissions et audit.',
    order: 110,
    categories: ['enterprises', 'users', 'roles', 'permissions', 'services', 'audit_logs', 'system_settings', 'backups', 'logs', 'integrations'],
    prefixes: ['enterprises', 'users', 'roles', 'permissions', 'services', 'audit_logs', 'system_settings', 'backups', 'logs', 'integrations'],
    subgroupLabels: {
      enterprises: 'Entreprises',
      users: 'Utilisateurs',
      roles: 'Roles',
      permissions: 'Permissions',
      services: 'Services',
      audit_logs: 'Journal d\'audit',
      system_settings: 'Parametres',
      backups: 'Sauvegardes',
      logs: 'Logs',
      integrations: 'Integrations',
    },
    dashboards: [
      { label: 'Utilisateurs', href: '/dashboard/admin/users' },
      { label: 'Permissions', href: '/dashboard/admin/permissions' },
    ],
  },
];

export const buildServiceDefinitionsFromModules = (modules: PermissionModule[] = []): ServiceDefinition[] => {
  if (!modules.length) {
    return serviceDefinitions;
  }

  return modules.map((moduleConfig) => {
    const subgroupLabels = Object.fromEntries(
      moduleConfig.categories.map((category) => [category.key, category.label]),
    );

    return {
      id: moduleConfig.key,
      label: moduleConfig.menuLabel || moduleConfig.label,
      description: moduleConfig.description || '',
      order: moduleConfig.order ?? 999,
      categories: moduleConfig.categories.map((category) => category.key),
      prefixes: moduleConfig.categories.map((category) => category.key),
      subgroupLabels,
      dashboards: dashboardLinksByService[moduleConfig.key] || [],
    };
  });
};

export const findServiceDefinition = (
  permission: Permission,
  definitions: ServiceDefinition[] = serviceDefinitions,
): ServiceDefinition => {
  const category = String(permission.category || '').toLowerCase();
  const prefix = String(permission.name || '').toLowerCase().split('.')[0];

  const directMatch = definitions.find(
    (service) => service.prefixes.includes(prefix) || service.categories.includes(category),
  );

  if (directMatch) {
    if (prefix === 'reports') {
      if (permission.name.includes('financial')) return definitions.find((s) => s.id === 'accounting') || directMatch;
      if (permission.name.includes('technical')) return definitions.find((s) => s.id === 'technical') || directMatch;
      if (permission.name.includes('hr')) return definitions.find((s) => s.id === 'hr') || directMatch;
      if (permission.name.includes('sales')) return definitions.find((s) => s.id === 'commercial') || directMatch;
      if (permission.name.includes('operations')) return definitions.find((s) => s.id === 'projects') || directMatch;
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
  if (prefix === 'credit_notes') {
    return 'credit_notes';
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

export const groupPermissionsByService = (
  permissions: Permission[],
  modules: PermissionModule[] = [],
): PermissionServiceGroup[] => {
  const definitions = buildServiceDefinitionsFromModules(modules);
  const groups = new Map<string, PermissionServiceGroup>();

  permissions.forEach((permission) => {
    const service = findServiceDefinition(permission, definitions);
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
