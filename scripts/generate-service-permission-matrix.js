const fs = require('fs');
const path = require('path');

const root = process.cwd();
const seedPath = path.join(root, 'services/auth-service/prisma/seed-complete-permissions.js');
const outputPath = path.join(root, 'docs/service-permission-matrix.md');

const serviceDefinitions = [
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
    dashboards: [{ label: 'Dashboard CRM', href: '/dashboard/crm' }],
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

const text = fs.readFileSync(seedPath, 'utf8');
const categoryRegex = /(\w+)\s*:\s*\{\s*label:\s*'([^']*)',\s*permissions:\s*\[([\s\S]*?)\]\s*\}/g;
const permRegex = /\{\s*name:\s*'([^']+)'\s*,\s*description:\s*'([^']*)'/g;

function findService(permission) {
  const category = String(permission.category || '').toLowerCase();
  const prefix = String(permission.name || '').toLowerCase().split('.')[0];
  const direct = serviceDefinitions.find((service) => service.prefixes.includes(prefix) || service.categories.includes(category));

  if (direct) {
    if (prefix === 'reports') {
      if (permission.name.includes('financial')) return serviceDefinitions.find((s) => s.id === 'accounting') || direct;
      if (permission.name.includes('technical')) return serviceDefinitions.find((s) => s.id === 'technical') || direct;
      if (permission.name.includes('hr')) return serviceDefinitions.find((s) => s.id === 'hr') || direct;
      if (permission.name.includes('sales')) return serviceDefinitions.find((s) => s.id === 'commercial') || direct;
      if (permission.name.includes('operations')) return serviceDefinitions.find((s) => s.id === 'projects') || direct;
    }
    return direct;
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
}

function subgroupId(permission) {
  const prefix = String(permission.name || '').toLowerCase().split('.')[0];
  if (prefix === 'reports') {
    if (permission.name.includes('financial')) return 'reports_financial';
    if (permission.name.includes('technical')) return 'reports_technical';
    if (permission.name.includes('hr')) return 'reports_hr';
    if (permission.name.includes('sales')) return 'reports_sales';
    return 'reports';
  }
  return prefix || 'other';
}

function subgroupLabel(service, id) {
  if (id === 'reports_financial') return 'Rapports financiers';
  if (id === 'reports_technical') return 'Analyses techniques';
  if (id === 'reports_hr') return 'Rapports RH';
  if (id === 'reports_sales') return 'Rapports commerciaux';
  if (id === 'reports') return 'Rapports';
  return service.subgroupLabels[id] || id.replace(/_/g, ' ');
}

const permissions = [];
let categoryMatch;
while ((categoryMatch = categoryRegex.exec(text)) !== null) {
  const [, categoryName, categoryLabel, rawPermissions] = categoryMatch;
  let permissionMatch;
  while ((permissionMatch = permRegex.exec(rawPermissions)) !== null) {
    permissions.push({
      category: categoryName,
      categoryLabel,
      name: permissionMatch[1],
      description: permissionMatch[2],
    });
  }
}

const grouped = new Map();
for (const permission of permissions) {
  const service = findService(permission);
  const sgId = subgroupId(permission);
  if (!grouped.has(service.id)) {
    grouped.set(service.id, {
      id: service.id,
      label: service.label,
      order: service.order,
      subgroups: new Map(),
    });
  }
  const serviceGroup = grouped.get(service.id);
  if (!serviceGroup.subgroups.has(sgId)) {
    serviceGroup.subgroups.set(sgId, {
      label: subgroupLabel(service, sgId),
      permissions: [],
    });
  }
  serviceGroup.subgroups.get(sgId).permissions.push(permission);
}

const services = Array.from(grouped.values()).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
let markdown = '# Matrice Services -> Sous-modules -> Permissions\n\n';
markdown += 'Source: `services/auth-service/prisma/seed-complete-permissions.js` et regroupement frontend courant.\n\n';

for (const service of services) {
  markdown += `## ${service.label}\n\n`;
  const serviceDefinition = serviceDefinitions.find((item) => item.id === service.id);
  if (serviceDefinition?.dashboards?.length) {
    markdown += '### Dashboards associes\n\n';
    serviceDefinition.dashboards.forEach((dashboard) => {
      markdown += `- \`${dashboard.href}\` - ${dashboard.label}\n`;
    });
    markdown += '\n';
  }
  const subgroups = Array.from(service.subgroups.entries())
    .map(([id, subgroup]) => ({ id, ...subgroup }))
    .sort((a, b) => a.label.localeCompare(b.label));

  for (const subgroup of subgroups) {
    markdown += `### ${subgroup.label}\n\n`;
    subgroup.permissions
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((permission) => {
        markdown += `- \`${permission.name}\`\n`;
      });
    markdown += '\n';
  }
}

fs.writeFileSync(outputPath, markdown, 'utf8');
console.log(`Generated ${path.relative(root, outputPath)} with ${permissions.length} permissions.`);
