import type { Permission } from '@/shared/api/admin/admin.service';

export interface PermissionSubgroup {
  id: string;
  label: string;
  permissions: Permission[];
}

export interface PermissionServiceGroup {
  id: string;
  label: string;
  order: number;
  permissions: Permission[];
  subgroups: PermissionSubgroup[];
  dashboards: Array<{ label: string; href: string }>;
}

interface ServiceDefinition {
  id: string;
  label: string;
  order: number;
  categories: string[];
  prefixes: string[];
  subgroupLabels: Record<string, string>;
  dashboards: Array<{ label: string; href: string }>;
}

export const serviceDefinitions: ServiceDefinition[] = [
  {
    id: 'dashboard',
    label: 'Tableau de Bord',
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
      { label: 'Dashboard global', href: '/dashboard' },
      { label: 'Analytics global', href: '/dashboard/analytics' },
    ],
  },
  {
    id: 'commercial',
    label: 'Commercial',
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
    label: 'Facturation',
    order: 40,
    categories: ['billing', 'invoices', 'payments'],
    prefixes: ['invoices', 'payments'],
    subgroupLabels: {
      invoices: 'Factures',
      payments: 'Paiements',
    },
    dashboards: [{ label: 'Dashboard facturation', href: '/dashboard/facturation' }],
  },
  {
    id: 'accounting',
    label: 'Comptabilite',
    order: 50,
    categories: ['expenses', 'payments', 'reports'],
    prefixes: ['expenses', 'payments'],
    subgroupLabels: {
      expenses: 'Depenses',
      payments: 'Ecritures & paiements',
      reports: 'Rapports financiers',
    },
    dashboards: [
      { label: 'Comptes', href: '/dashboard/comptabilite/comptes' },
      { label: 'Rapports comptables', href: '/dashboard/comptabilite/rapports' },
    ],
  },
  {
    id: 'technical',
    label: 'Services Techniques',
    order: 60,
    categories: ['technical', 'missions', 'interventions', 'techniciens', 'specialites', 'materiel', 'rapports_techniques'],
    prefixes: ['missions', 'interventions', 'techniciens', 'specialites', 'materiel', 'rapports_techniques'],
    subgroupLabels: {
      missions: 'Missions',
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
    ],
  },
  {
    id: 'projects',
    label: 'Gestion de Projets',
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
    order: 80,
    categories: ['procurement', 'products', 'suppliers', 'purchase_orders', 'purchase_requests', 'inventory'],
    prefixes: ['products', 'suppliers', 'purchase_orders', 'purchase_requests', 'inventory'],
    subgroupLabels: {
      products: 'Produits',
      suppliers: 'Fournisseurs',
      purchase_requests: 'Demandes d\'achat',
      purchase_orders: 'Commandes d\'achat',
      inventory: 'Stocks',
    },
    dashboards: [{ label: 'Dashboard achats', href: '/dashboard/achats' }],
  },
  {
    id: 'hr',
    label: 'Ressources Humaines',
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
